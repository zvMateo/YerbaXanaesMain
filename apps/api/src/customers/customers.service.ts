import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    // Get all users with their order statistics
    const users = await this.prisma.user.findMany({
      where: {
        role: Role.USER, // Only customers, not admins
      },
      include: {
        orders: {
          select: {
            id: true,
            total: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform to customer format
    return users.map((user) => {
      const totalSpent = user.orders.reduce(
        (sum, order) => sum + Number(order.total),
        0,
      );

      const lastOrder =
        user.orders.length > 0
          ? user.orders.sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )[0]
          : null;

      // Calculate segment based on spending and activity
      const segment = this.calculateSegment(
        totalSpent,
        user.orders.length,
        lastOrder?.createdAt,
      );

      return {
        id: user.id,
        name: user.name || 'Sin nombre',
        email: user.email,
        phone: user.phone || '',
        orders: user._count.orders,
        totalSpent,
        lastOrder: lastOrder
          ? lastOrder.createdAt.toISOString().split('T')[0]
          : null,
        segment,
        createdAt: user.createdAt.toISOString(),
      };
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        orders: {
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
          orderBy: {
            createdAt: 'desc',
          },
        },
        address: true,
      },
    });

    if (!user) {
      throw new Error('Customer not found');
    }

    const totalSpent = user.orders.reduce(
      (sum, order) => sum + Number(order.total),
      0,
    );

    const segment = this.calculateSegment(
      totalSpent,
      user.orders.length,
      user.orders[0]?.createdAt,
    );

    return {
      id: user.id,
      name: user.name || 'Sin nombre',
      email: user.email,
      phone: user.phone || '',
      orders: user.orders.length,
      totalSpent,
      lastOrder: user.orders[0]?.createdAt.toISOString().split('T')[0] || null,
      segment,
      address: user.address,
      createdAt: user.createdAt.toISOString(),
      orderHistory: user.orders.map((order) => ({
        id: order.id,
        date: order.createdAt.toISOString().split('T')[0],
        total: Number(order.total),
        status: order.status,
        items: order.items.length,
      })),
    };
  }

  async getStats() {
    const users = await this.prisma.user.findMany({
      where: { role: Role.USER },
      include: {
        orders: {
          select: {
            total: true,
            createdAt: true,
          },
        },
      },
    });

    const totalCustomers = users.length;
    const totalRevenue = users.reduce(
      (sum, user) =>
        sum +
        user.orders.reduce(
          (orderSum, order) => orderSum + Number(order.total),
          0,
        ),
      0,
    );

    // Segment counts
    const segmentCounts = {
      vip: 0,
      regular: 0,
      new: 0,
      'at-risk': 0,
    };

    users.forEach((user) => {
      const totalSpent = user.orders.reduce(
        (sum, order) => sum + Number(order.total),
        0,
      );
      const lastOrder =
        user.orders.length > 0
          ? user.orders.sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )[0]
          : null;

      const segment = this.calculateSegment(
        totalSpent,
        user.orders.length,
        lastOrder?.createdAt,
      );
      segmentCounts[segment]++;
    });

    // New customers in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newCustomers = users.filter(
      (user) => new Date(user.createdAt) >= thirtyDaysAgo,
    ).length;

    // At-risk customers (no orders in 60 days)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const atRiskCustomers = users.filter((user) => {
      const lastOrder =
        user.orders.length > 0
          ? user.orders.sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )[0]
          : null;
      return lastOrder && new Date(lastOrder.createdAt) < sixtyDaysAgo;
    }).length;

    // Top customers
    const topCustomers = users
      .map((user) => ({
        id: user.id,
        name: user.name || 'Sin nombre',
        orders: user.orders.length,
        totalSpent: user.orders.reduce(
          (sum, order) => sum + Number(order.total),
          0,
        ),
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

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
