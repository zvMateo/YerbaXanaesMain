import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

// Tope de seguridad: evita cargar toda la tabla de clientes en memoria (riesgo OOM
// en Railway Hobby). El segmento y el gasto se calculan en memoria sobre este set.
// Para una tienda chica alcanza; si se supera, migrar a paginación server-side real.
const MAX_CUSTOMERS = 500;
const GUEST_ID_PREFIX = 'guest:';

type OrderSnapshot = {
  id: string;
  total: { toString(): string } | number;
  status: string;
  createdAt: Date;
  customerEmail: string;
  customerName: string | null;
  customerPhone: string | null;
  shippingCity: string | null;
  userId: string | null;
};

type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders: number;
  totalSpent: number;
  lastOrder: string | null;
  segment: 'vip' | 'regular' | 'new' | 'at-risk';
  createdAt: string;
};

export function isGuestCustomerId(id: string): boolean {
  return id.startsWith(GUEST_ID_PREFIX);
}

export function guestCustomerId(email: string): string {
  return `${GUEST_ID_PREFIX}${normalizeEmail(email)}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function money(value: { toString(): string } | number): number {
  return Number(value);
}

function isoDate(value: Date): string {
  return value.toISOString().split('T')[0];
}

function itemsSummary(
  items: Array<{
    quantity: number;
    variant: { name: string; product: { name: string } };
  }>,
): string {
  return items
    .map((item) => {
      const product = item.variant.product.name;
      const variant = item.variant.name;
      const label =
        variant && variant !== product ? `${product} (${variant})` : product;
      return `${label} ×${item.quantity}`;
    })
    .join(', ');
}

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const rows = await this.loadCustomerRows();
    return rows.slice(0, MAX_CUSTOMERS);
  }

  async findOne(id: string) {
    if (isGuestCustomerId(id)) {
      return this.findGuestByEmail(id.slice(GUEST_ID_PREFIX.length));
    }
    return this.findRegisteredUser(id);
  }

  async getStats() {
    const customers = await this.loadCustomerRows();

    const totalCustomers = customers.length;
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);

    const segmentCounts = {
      vip: 0,
      regular: 0,
      new: 0,
      'at-risk': 0,
    };

    customers.forEach((customer) => {
      segmentCounts[customer.segment]++;
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newCustomers = customers.filter(
      (customer) => new Date(customer.createdAt) >= thirtyDaysAgo,
    ).length;

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const atRiskCustomers = customers.filter((customer) => {
      if (!customer.lastOrder) return false;
      return new Date(customer.lastOrder) < sixtyDaysAgo;
    }).length;

    const topCustomers = [...customers]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5)
      .map((customer) => ({
        id: customer.id,
        name: customer.name,
        orders: customer.orders,
        totalSpent: customer.totalSpent,
      }));

    return {
      totalCustomers,
      totalRevenue,
      segmentCounts,
      vipCustomers: segmentCounts.vip,
      newCustomers,
      atRiskCustomers,
      topCustomers,
      averageCustomerValue:
        totalCustomers > 0 ? totalRevenue / totalCustomers : 0,
    };
  }

  private async loadCustomerRows(): Promise<CustomerRow[]> {
    const [users, orders] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: Role.USER },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      }),
      this.prisma.order.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          total: true,
          status: true,
          createdAt: true,
          customerEmail: true,
          customerName: true,
          customerPhone: true,
          shippingCity: true,
          userId: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const ordersByEmail = new Map<string, OrderSnapshot[]>();
    const ordersByUserId = new Map<string, OrderSnapshot[]>();

    for (const order of orders) {
      const email = normalizeEmail(order.customerEmail || '');
      if (email) {
        const list = ordersByEmail.get(email) ?? [];
        list.push(order);
        ordersByEmail.set(email, list);
      }
      if (order.userId) {
        const list = ordersByUserId.get(order.userId) ?? [];
        list.push(order);
        ordersByUserId.set(order.userId, list);
      }
    }

    const userEmails = new Set(users.map((user) => normalizeEmail(user.email)));

    const userRows = users.map((user) => {
      const email = normalizeEmail(user.email);
      const merged = this.uniqueOrders([
        ...(ordersByEmail.get(email) ?? []),
        ...(ordersByUserId.get(user.id) ?? []),
      ]);
      return this.toCustomerRow({
        id: user.id,
        name: user.name || this.latestName(merged) || 'Sin nombre',
        email: user.email,
        phone: user.phone || this.latestPhone(merged) || '',
        createdAt: user.createdAt,
        orders: merged,
      });
    });

    const guestRows: CustomerRow[] = [];
    for (const [email, guestOrders] of ordersByEmail) {
      if (userEmails.has(email)) continue;
      const latest = guestOrders[0];
      const oldest = guestOrders[guestOrders.length - 1];
      guestRows.push(
        this.toCustomerRow({
          id: guestCustomerId(email),
          name: latest.customerName || 'Sin nombre',
          email: latest.customerEmail || email,
          phone: this.latestPhone(guestOrders) || '',
          createdAt: oldest.createdAt,
          orders: guestOrders,
        }),
      );
    }

    return [...userRows, ...guestRows].sort((a, b) => {
      const aKey = a.lastOrder || a.createdAt;
      const bKey = b.lastOrder || b.createdAt;
      return new Date(bKey).getTime() - new Date(aKey).getTime();
    });
  }

  private async findRegisteredUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { address: true },
    });

    if (!user) {
      throw new NotFoundException('Customer not found');
    }

    const orders = await this.prisma.order.findMany({
      where: {
        deletedAt: null,
        OR: [
          { userId: user.id },
          { customerEmail: { equals: user.email, mode: 'insensitive' } },
        ],
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.toCustomerDetails({
      id: user.id,
      name: user.name || this.latestName(orders) || 'Sin nombre',
      email: user.email,
      phone: user.phone || this.latestPhone(orders) || '',
      createdAt: user.createdAt,
      address: user.address,
      orders,
    });
  }

  private async findGuestByEmail(email: string) {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      throw new NotFoundException('Customer not found');
    }

    const orders = await this.prisma.order.findMany({
      where: {
        deletedAt: null,
        customerEmail: { equals: normalized, mode: 'insensitive' },
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (orders.length === 0) {
      throw new NotFoundException('Customer not found');
    }

    const latest = orders[0];
    const oldest = orders[orders.length - 1];

    return this.toCustomerDetails({
      id: guestCustomerId(normalized),
      name: latest.customerName || 'Sin nombre',
      email: latest.customerEmail || normalized,
      phone: this.latestPhone(orders) || '',
      createdAt: oldest.createdAt,
      address: null,
      orders,
    });
  }

  private toCustomerRow(input: {
    id: string;
    name: string;
    email: string;
    phone: string;
    createdAt: Date;
    orders: OrderSnapshot[];
  }): CustomerRow {
    const totalSpent = input.orders.reduce(
      (sum, order) => sum + money(order.total),
      0,
    );
    const lastOrder = input.orders[0] ?? null;
    const segment = this.calculateSegment(
      totalSpent,
      input.orders.length,
      lastOrder?.createdAt,
    );

    return {
      id: input.id,
      name: input.name,
      email: input.email,
      phone: input.phone,
      orders: input.orders.length,
      totalSpent,
      lastOrder: lastOrder ? isoDate(lastOrder.createdAt) : null,
      segment,
      createdAt: input.createdAt.toISOString(),
    };
  }

  private toCustomerDetails(input: {
    id: string;
    name: string;
    email: string;
    phone: string;
    createdAt: Date;
    address: unknown;
    orders: Array<
      OrderSnapshot & {
        items: Array<{
          quantity: number;
          variant: { name: string; product: { name: string } };
        }>;
      }
    >;
  }) {
    const row = this.toCustomerRow(input);
    return {
      ...row,
      address: input.address,
      orderHistory: input.orders.map((order) => ({
        id: order.id,
        date: isoDate(order.createdAt),
        total: money(order.total),
        status: order.status,
        items: order.items.length,
        itemsSummary: itemsSummary(order.items),
        phone: order.customerPhone || '',
        city: order.shippingCity || '',
      })),
    };
  }

  private uniqueOrders(orders: OrderSnapshot[]): OrderSnapshot[] {
    const seen = new Set<string>();
    const unique: OrderSnapshot[] = [];
    for (const order of orders) {
      if (seen.has(order.id)) continue;
      seen.add(order.id);
      unique.push(order);
    }
    unique.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return unique;
  }

  private latestName(orders: Array<{ customerName: string | null }>): string {
    return orders.find((order) => order.customerName)?.customerName || '';
  }

  private latestPhone(orders: Array<{ customerPhone: string | null }>): string {
    return orders.find((order) => order.customerPhone)?.customerPhone || '';
  }

  private calculateSegment(
    totalSpent: number,
    orderCount: number,
    lastOrderDate?: Date,
  ): 'vip' | 'regular' | 'new' | 'at-risk' {
    // VIP: Más de 5 órdenes o más de $100k gastado
    if (orderCount >= 5 || totalSpent >= 100000) {
      return 'vip';
    }

    // New: 1 orden o menos
    if (orderCount <= 1) {
      return 'new';
    }

    // At-risk: No compra en 60 días
    if (lastOrderDate) {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      if (new Date(lastOrderDate) < sixtyDaysAgo) {
        return 'at-risk';
      }
    }

    // Regular: Todo lo demás
    return 'regular';
  }
}
