"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Package,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Calendar,
  RefreshCw,
  MoreHorizontal,
  AlertTriangle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { toast } from "sonner";
import {
  useDashboard,
  useDashboardAlerts,
  type DashboardMetrics,
} from "@/hooks/use-dashboard";
import { DashboardSkeleton } from "./skeletons";
import { ErrorState } from "./empty-states";

type Period = "today" | "week" | "month" | "year";

// ============================================
// KPI CARD COMPONENT
// ============================================

interface KPICardProps {
  title: string;
  value: string;
  change: number;
  trend: "up" | "down";
  icon: React.ElementType;
  subtitle: string;
  loading?: boolean;
}

function KPICard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  subtitle,
  loading = false,
}: KPICardProps) {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200"
      >
        <div className="h-4 w-24 bg-stone-200 rounded animate-pulse mb-4" />
        <div className="h-8 w-32 bg-stone-300 rounded animate-pulse mb-2" />
        <div className="h-4 w-20 bg-stone-200 rounded animate-pulse" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-stone-500">{title}</p>
          <h3 className="text-3xl font-bold text-stone-900">{value}</h3>
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center text-sm font-medium ${
                trend === "up" ? "text-green-600" : "text-red-600"
              }`}
            >
              {trend === "up" ? (
                <ArrowUpRight className="h-4 w-4 mr-0.5" />
              ) : (
                <ArrowDownRight className="h-4 w-4 mr-0.5" />
              )}
              {Math.abs(change)}%
            </span>
            <span className="text-sm text-stone-400">vs ayer</span>
          </div>
        </div>
        <div className="w-12 h-12 bg-yerba-100 rounded-xl flex items-center justify-center">
          <Icon className="h-6 w-6 text-yerba-600" />
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-stone-100">
        <p className="text-sm text-stone-500">{subtitle}</p>
      </div>
    </motion.div>
  );
}

// ============================================
// ALERT BANNER COMPONENT
// ============================================

function AlertBanner({
  alerts,
}: {
  alerts: Array<{
    type: string;
    title: string;
    message: string;
    action: string;
    link: string;
  }>;
}) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`rounded-2xl p-4 flex items-center gap-4 ${
            alert.type === "error"
              ? "bg-red-50 border border-red-200"
              : alert.type === "warning"
                ? "bg-amber-50 border border-amber-200"
                : "bg-blue-50 border border-blue-200"
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              alert.type === "error"
                ? "bg-red-100"
                : alert.type === "warning"
                  ? "bg-amber-100"
                  : "bg-blue-100"
            }`}
          >
            <AlertTriangle
              className={`h-5 w-5 ${
                alert.type === "error"
                  ? "text-red-600"
                  : alert.type === "warning"
                    ? "text-amber-600"
                    : "text-blue-600"
              }`}
            />
          </div>
          <div className="flex-1">
            <h4
              className={`font-medium ${
                alert.type === "error"
                  ? "text-red-900"
                  : alert.type === "warning"
                    ? "text-amber-900"
                    : "text-blue-900"
              }`}
            >
              {alert.title}
            </h4>
            <p
              className={`text-sm ${
                alert.type === "error"
                  ? "text-red-600"
                  : alert.type === "warning"
                    ? "text-amber-600"
                    : "text-blue-600"
              }`}
            >
              {alert.message}
            </p>
          </div>
          <button
            onClick={() => toast.info(`Navegando a ${alert.link}`)}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${
              alert.type === "error"
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : alert.type === "warning"
                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
          >
            {alert.action}
          </button>
        </motion.div>
      ))}
    </div>
  );
}

// ============================================
// MAIN DASHBOARD CONTENT
// ============================================

export function DashboardContent() {
  const [period, setPeriod] = useState<Period>("week");
  const { data: metrics, isLoading, error, refetch } = useDashboard();
  const { alerts } = useDashboardAlerts();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !metrics) {
    return (
      <ErrorState
        title="Error al cargar el dashboard"
        message={error?.message || "No se pudieron cargar las métricas"}
        onRetry={() => refetch()}
      />
    );
  }

  const kpiCards = [
    {
      title: "Ingresos hoy",
      value: `$${metrics.todayRevenue.toLocaleString("es-AR")}`,
      change: metrics.revenueChange,
      trend: metrics.revenueChange >= 0 ? "up" : ("down" as "up" | "down"),
      icon: DollarSign,
      subtitle: `${metrics.todayOrders} órdenes hoy`,
    },
    {
      title: "Órdenes",
      value: metrics.totalOrders.toString(),
      change: metrics.ordersChange,
      trend: metrics.ordersChange >= 0 ? "up" : ("down" as "up" | "down"),
      icon: ShoppingCart,
      subtitle: `${metrics.pendingOrders} pendientes`,
    },
    {
      title: "Clientes",
      value: metrics.totalCustomers.toString(),
      change: metrics.customersChange,
      trend: metrics.customersChange >= 0 ? "up" : ("down" as "up" | "down"),
      icon: Users,
      subtitle: `${metrics.newCustomersThisMonth} nuevos este mes`,
    },
    {
      title: "Alertas stock",
      value: metrics.lowStockProducts.toString(),
      change: 0,
      trend: "down" as "up" | "down",
      icon: Package,
      subtitle: `${metrics.outOfStockProducts} sin stock`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>
          <p className="text-stone-500">Resumen de tu negocio</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 bg-white"
          >
            <option value="today">Hoy</option>
            <option value="week">Esta semana</option>
            <option value="month">Este mes</option>
            <option value="year">Este año</option>
          </select>
          <button
            onClick={() => refetch()}
            className="p-2.5 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
          >
            <RefreshCw className="h-5 w-5 text-stone-600" />
          </button>
        </div>
      </div>

      {/* Alerts */}
      <AlertBanner alerts={alerts} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, index) => (
          <KPICard key={card.title} {...card} loading={isLoading} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Sales Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-stone-200"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-stone-900">Ventas semanales</h3>
            <button
              onClick={() => toast.success("Exportando gráfico...")}
              className="text-sm text-yerba-600 hover:text-yerba-700"
            >
              Descargar
            </button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.weeklySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#619c50"
                  strokeWidth={3}
                  dot={{ fill: "#619c50", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Category Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200"
        >
          <h3 className="font-semibold text-stone-900 mb-6">
            Ventas por categoría
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.salesByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  dataKey="value"
                >
                  {metrics.salesByCategory.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={["#619c50", "#b58b5a", "#3b82f6", "#f59e0b"][index]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {metrics.salesByCategory.map((cat, index) => (
              <div
                key={cat.category}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: [
                        "#619c50",
                        "#b58b5a",
                        "#3b82f6",
                        "#f59e0b",
                      ][index],
                    }}
                  />
                  <span className="text-sm text-stone-600">{cat.category}</span>
                </div>
                <span className="text-sm font-medium text-stone-900">
                  {cat.percentage}%
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-stone-900">
              Productos más vendidos
            </h3>
            <button
              onClick={() => toast.success("Ver todos los productos...")}
              className="text-sm text-yerba-600 hover:text-yerba-700"
            >
              Ver todos
            </button>
          </div>
          <div className="space-y-4">
            {metrics.topSellingProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-stone-50 transition-colors"
              >
                <div className="w-10 h-10 bg-yerba-100 rounded-lg flex items-center justify-center text-yerba-700 font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-stone-900">{product.name}</p>
                  <p className="text-sm text-stone-500">
                    {product.sales} vendidos
                  </p>
                </div>
                <span className="font-semibold text-stone-900">
                  ${product.revenue.toLocaleString("es-AR")}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Hourly Sales */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200"
        >
          <h3 className="font-semibold text-stone-900 mb-6">Ventas por hora</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.hourlySales}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#619c50" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#619c50" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hour" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="#619c50"
                  fillOpacity={1}
                  fill="url(#colorOrders)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
