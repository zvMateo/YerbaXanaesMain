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

    // Today's stats
    const todayOrders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: today,
        },
      },
    });
    const todayRevenue = todayOrders.reduce(
      (sum, order) => sum + Number(order.total),
      0,
    );

    // Yesterday's stats
    const yesterdayOrders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: yesterday,
          lt: today,
        },
      },
    });
    const yesterdayRevenue = yesterdayOrders.reduce(
      (sum, order) => sum + Number(order.total),
      0,
    );

    // Weekly stats
    const weekOrders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });
    const weekRevenue = weekOrders.reduce(
      (sum, order) => sum + Number(order.total),
      0,
    );

    // Monthly stats
    const monthOrders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });
    const monthRevenue = monthOrders.reduce(
      (sum, order) => sum + Number(order.total),
      0,
    );

    // Calculate changes
    const revenueChange =
      yesterdayRevenue > 0
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
        : 0;

    // Pending orders
    const pendingOrders = await this.prisma.order.count({
      where: { status: OrderStatus.PENDING },
    });

    // Total orders
    const totalOrders = await this.prisma.order.count();

    // Total customers
    const totalCustomers = await this.prisma.user.count({
      where: { role: 'USER' },
    });

    // New customers this month
    const newCustomersThisMonth = await this.prisma.user.count({
      where: {
        role: 'USER',
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Weekly sales data
    const weeklySales = await this.getWeeklySales();

    // Sales by category
    const salesByCategory = await this.getSalesByCategory();

    // Top selling products
    const topSellingProducts = await this.getTopSellingProducts();

    // Low stock products (fetch all with minStockAlert and filter in memory)
    const inventoryItems = await this.prisma.inventoryItem.findMany({
      where: {
        minStockAlert: { not: null },
      },
    });

    const lowStockProducts = inventoryItems.filter(
      (item) => item.currentStock <= (item.minStockAlert || 0),
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
      hourlySales: await this.getHourlySalesData(),
    };
  }

  async getAlerts() {
    const alerts: Alert[] = [];

    // Low stock alerts
    const lowStockItems = await this.prisma.inventoryItem.findMany({
      where: {
        minStockAlert: { not: null },
      },
    });

    const criticalStock = lowStockItems.filter(
      (item) => item.currentStock <= (item.minStockAlert || 0),
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

    // Pending orders alert
    const pendingCount = await this.prisma.order.count({
      where: { status: OrderStatus.PENDING },
    });

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

  private async getWeeklySales() {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const result: WeeklySale[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const orders = await this.prisma.order.findMany({
        where: {
          createdAt: {
            gte: date,
            lt: nextDay,
          },
        },
      });

      const revenue = orders.reduce(
        (sum, order) => sum + Number(order.total),
        0,
      );

      result.push({
        day: days[date.getDay() === 0 ? 6 : date.getDay() - 1],
        revenue,
        orders: orders.length,
      });
    }

    return result;
  }

  private async getSalesByCategory() {
    // Get all order items with their product categories
    const orderItems = await this.prisma.orderItem.findMany({
      include: {
        variant: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    // Group by category
    const categorySales: Record<string, number> = {};

    orderItems.forEach((item) => {
      const category = item.variant.product.category.name;
      if (!categorySales[category]) {
        categorySales[category] = 0;
      }
      categorySales[category] += Number(item.price) * item.quantity;
    });

    // Calculate percentages
    const total = Object.values(categorySales).reduce(
      (sum, val) => sum + val,
      0,
    );

    return Object.entries(categorySales).map(([category, value]) => ({
      category,
      value: Math.round((value / total) * 100),
      percentage: Math.round((value / total) * 100),
    }));
  }

  private async getTopSellingProducts() {
    const orderItems = await this.prisma.orderItem.findMany({
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
      take: 1000,
    });

    // Group by product
    const productSales: Record<
      string,
      { name: string; sales: number; revenue: number }
    > = {};

    orderItems.forEach((item) => {
      const productId = item.variant.product.id;
      const productName = item.variant.product.name;

      if (!productSales[productId]) {
        productSales[productId] = {
          name: productName,
          sales: 0,
          revenue: 0,
        };
      }

      productSales[productId].sales += item.quantity;
      productSales[productId].revenue += Number(item.price) * item.quantity;
    });

    // Sort and get top 5
    return Object.entries(productSales)
      .map(([id, data]) => ({
        id,
        ...data,
      }))
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

    // Build a map hour → count
    const hourMap: Record<number, number> = {};
    for (const order of orders) {
      const h = order.createdAt.getHours();
      hourMap[h] = (hourMap[h] || 0) + 1;
    }

    // Return hours 8–22
    return Array.from({ length: 15 }, (_, i) => {
      const h = i + 8;
      return { hour: `${h}hs`, orders: hourMap[h] || 0 };
    });
  }
}
