import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

export interface Alert {
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  action: string;
  link: string;
}

export interface WeeklySale {
  day: string;
  revenue: number;
  orders: number;
}

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Ejecutar todas las queries independientes en paralelo
    const [
      todayOrders,
      yesterdayOrders,
      weekOrders,
      monthOrders,
      pendingOrders,
      totalOrders,
      totalCustomers,
      newCustomersThisMonth,
      inventoryItems,
      weeklySales,
      salesByCategory,
      topSellingProducts,
      hourlySales,
    ] = await Promise.all([
      this.prisma.order.findMany({
        where: { createdAt: { gte: today }, deletedAt: null },
        select: { total: true },
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: yesterday, lt: today }, deletedAt: null },
        select: { total: true },
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: sevenDaysAgo }, deletedAt: null },
        select: { total: true },
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: thirtyDaysAgo }, deletedAt: null },
        select: { total: true },
      }),
      this.prisma.order.count({
        where: { status: OrderStatus.PENDING, deletedAt: null },
      }),
      this.prisma.order.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { role: 'USER' } }),
      this.prisma.user.count({
        where: { role: 'USER', createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.inventoryItem.findMany({
        where: { minStockAlert: { not: null } },
        select: { currentStock: true, minStockAlert: true },
      }),
      this.getWeeklySales(),
      this.getSalesByCategory(),
      this.getTopSellingProducts(),
      this.getHourlySalesData(),
    ]);

    const todayRevenue = todayOrders.reduce(
      (sum, o) => sum + Number(o.total),
      0,
    );
    const yesterdayRevenue = yesterdayOrders.reduce(
      (sum, o) => sum + Number(o.total),
      0,
    );
    const weekRevenue = weekOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const monthRevenue = monthOrders.reduce(
      (sum, o) => sum + Number(o.total),
      0,
    );

    const revenueChange =
      yesterdayRevenue > 0
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
        : 0;

    const lowStockProducts = inventoryItems.filter(
      (item) => item.currentStock <= (item.minStockAlert ?? 0),
    ).length;

    return {
      todayRevenue,
      yesterdayRevenue,
      weekRevenue,
      monthRevenue,
      revenueChange: Math.round(revenueChange * 100) / 100,
      todayOrders: todayOrders.length,
      pendingOrders,
      totalOrders,
      ordersChange: 0,
      totalCustomers,
      newCustomersThisMonth,
      customersChange: 0,
      lowStockProducts,
      outOfStockProducts: 0,
      topSellingProducts,
      weeklySales,
      salesByCategory,
      hourlySales,
    };
  }

  async getAlerts() {
    const alerts: Alert[] = [];

    const [lowStockItems, pendingCount] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where: { minStockAlert: { not: null } },
        select: { currentStock: true, minStockAlert: true },
      }),
      this.prisma.order.count({
        where: { status: OrderStatus.PENDING, deletedAt: null },
      }),
    ]);

    const criticalStock = lowStockItems.filter(
      (item) => item.currentStock <= (item.minStockAlert ?? 0),
    );

    if (criticalStock.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'Stock bajo',
        message: `${criticalStock.length} productos con stock bajo`,
        action: 'Ver inventario',
        link: '/productos',
      });
    }

    if (pendingCount > 5) {
      alerts.push({
        type: 'info',
        title: 'Órdenes pendientes',
        message: `${pendingCount} órdenes esperan procesamiento`,
        action: 'Ver órdenes',
        link: '/ordenes',
      });
    }

    return alerts;
  }

  private async getWeeklySales(): Promise<WeeklySale[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Una sola query en lugar de 7 queries en loop
    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: sevenDaysAgo }, deletedAt: null },
      select: { createdAt: true, total: true },
    });

    // Construir mapa por fecha local (YYYY-MM-DD)
    const dayMap: Record<
      string,
      { revenue: number; orders: number; date: Date }
    > = {};

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString().slice(0, 10);
      dayMap[key] = { revenue: 0, orders: 0, date };
    }

    for (const order of orders) {
      const key = order.createdAt.toISOString().slice(0, 10);
      if (dayMap[key]) {
        dayMap[key].revenue += Number(order.total);
        dayMap[key].orders += 1;
      }
    }

    return Object.values(dayMap).map(({ revenue, orders: count, date }) => ({
      day: DAY_LABELS[date.getDay() === 0 ? 6 : date.getDay() - 1],
      revenue,
      orders: count,
    }));
  }

  private async getSalesByCategory() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Filtro de fecha (últimos 30 días) + excluir órdenes eliminadas
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          deletedAt: null,
          createdAt: { gte: thirtyDaysAgo },
        },
      },
      include: {
        variant: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
    });

    const categorySales: Record<string, number> = {};

    for (const item of orderItems) {
      const category = item.variant.product.category.name;
      categorySales[category] =
        (categorySales[category] ?? 0) + Number(item.price) * item.quantity;
    }

    const total = Object.values(categorySales).reduce(
      (sum, val) => sum + val,
      0,
    );
    if (total === 0) return [];

    return Object.entries(categorySales).map(([category, value]) => ({
      category,
      value: Math.round((value / total) * 100),
      percentage: Math.round((value / total) * 100),
    }));
  }

  private async getTopSellingProducts() {
    // take: 200 en lugar de 1000 — suficiente para elegir top 5 con margen
    const orderItems = await this.prisma.orderItem.findMany({
      where: { order: { deletedAt: null } },
      include: {
        variant: {
          include: { product: true },
        },
      },
      orderBy: { quantity: 'desc' },
      take: 200,
    });

    const productSales: Record<
      string,
      { name: string; sales: number; revenue: number }
    > = {};

    for (const item of orderItems) {
      const productId = item.variant.product.id;
      const productName = item.variant.product.name;

      if (!productSales[productId]) {
        productSales[productId] = { name: productName, sales: 0, revenue: 0 };
      }

      productSales[productId].sales += item.quantity;
      productSales[productId].revenue += Number(item.price) * item.quantity;
    }

    return Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  private async getHourlySalesData() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: {
          in: [
            OrderStatus.PAID,
            OrderStatus.PROCESSING,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
          ],
        },
        deletedAt: null,
      },
      select: { createdAt: true },
    });

    const hourMap: Record<number, number> = {};
    for (const order of orders) {
      const h = order.createdAt.getHours();
      hourMap[h] = (hourMap[h] || 0) + 1;
    }

    return Array.from({ length: 15 }, (_, i) => {
      const h = i + 8;
      return { hour: `${h}hs`, orders: hourMap[h] || 0 };
    });
  }
}
