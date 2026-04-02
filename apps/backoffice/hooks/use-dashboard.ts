"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ============================================
// TIPOS
// ============================================

export interface DashboardMetrics {
  todayRevenue: number;
  yesterdayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  revenueChange: number;
  todayOrders: number;
  pendingOrders: number;
  totalOrders: number;
  ordersChange: number;
  totalCustomers: number;
  newCustomersThisMonth: number;
  vipCustomers: number;
  customersChange: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  topSellingProducts: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  weeklySales: Array<{
    day: string;
    revenue: number;
    orders: number;
  }>;
  salesByCategory: Array<{
    category: string;
    value: number;
    percentage: number;
  }>;
  hourlySales: Array<{
    hour: string;
    orders: number;
  }>;
}

export interface DashboardAlert {
  type: "warning" | "error" | "info";
  title: string;
  message: string;
  action: string;
  link: string;
}

// ============================================
// API FUNCTIONS
// ============================================

async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const response = await fetchWithAuth(`${API_URL}/dashboard/metrics`);
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("No autorizado. Iniciá sesión nuevamente.");
    }
    throw new Error("Error al cargar métricas");
  }
  return response.json();
}

async function fetchDashboardAlerts(): Promise<DashboardAlert[]> {
  const response = await fetchWithAuth(`${API_URL}/dashboard/alerts`);
  if (!response.ok) {
    return []; // Return empty alerts on error
  }
  return response.json();
}

// ============================================
// REACT QUERY KEYS
// ============================================

export const dashboardKeys = {
  all: ["dashboard"] as const,
  metrics: () => [...dashboardKeys.all, "metrics"] as const,
  alerts: () => [...dashboardKeys.all, "alerts"] as const,
};

// ============================================
// HOOKS
// ============================================

export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.metrics(),
    queryFn: fetchDashboardMetrics,
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60 * 2,
  });
}

export function useDashboardAlerts() {
  const { data: alerts = [] } = useQuery({
    queryKey: dashboardKeys.alerts(),
    queryFn: fetchDashboardAlerts,
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60 * 2,
  });

  return { alerts, count: alerts.length };
}

export function useDashboardFormatted() {
  const { data: metrics, isLoading, error } = useDashboard();

  const formatted = useMemo(() => {
    if (!metrics) return null;

    return {
      ...metrics,
      todayRevenueFormatted: `$${metrics.todayRevenue.toLocaleString("es-AR")}`,
      weekRevenueFormatted: `$${metrics.weekRevenue.toLocaleString("es-AR")}`,
      monthRevenueFormatted: `$${metrics.monthRevenue.toLocaleString("es-AR")}`,
      revenueChangeFormatted: `${metrics.revenueChange >= 0 ? "+" : ""}${metrics.revenueChange}%`,
    };
  }, [metrics]);

  return { data: formatted, isLoading, error };
}
