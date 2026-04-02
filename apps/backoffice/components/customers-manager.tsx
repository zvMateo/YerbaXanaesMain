"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Users,
  Mail,
  Phone,
  ShoppingBag,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
  Star,
  Download,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  useCustomers,
  useCustomerStats,
  type Customer,
  type CustomerSegment,
} from "@/hooks/use-customers";
import { CustomersSkeleton } from "./skeletons";
import { EmptyState, ErrorState } from "./empty-states";

// Status configurations
const segmentConfig: Record<
  CustomerSegment,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  vip: {
    label: "VIP",
    color: "text-amber-700",
    bg: "bg-amber-100",
    icon: Star,
  },
  regular: {
    label: "Regular",
    color: "text-blue-700",
    bg: "bg-blue-100",
    icon: Users,
  },
  new: {
    label: "Nuevo",
    color: "text-green-700",
    bg: "bg-green-100",
    icon: Users,
  },
  "at-risk": {
    label: "En riesgo",
    color: "text-red-700",
    bg: "bg-red-100",
    icon: Users,
  },
};

function SegmentBadge({ segment }: { segment: CustomerSegment }) {
  const config = segmentConfig[segment];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

export function CustomersManager() {
  const { data: customers, isLoading, error, refetch } = useCustomers();
  const { data: stats } = useCustomerStats();

  const [searchTerm, setSearchTerm] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<CustomerSegment | "all">(
    "all",
  );
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];

    return customers.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm);

      const matchesSegment =
        segmentFilter === "all" || customer.segment === segmentFilter;

      return matchesSearch && matchesSegment;
    });
  }, [customers, searchTerm, segmentFilter]);

  // Loading state
  if (isLoading) {
    return <CustomersSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title="Error al cargar clientes"
        message={error.message}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200"
          >
            <p className="text-sm text-stone-500">Total clientes</p>
            <p className="text-2xl font-bold text-stone-900">
              {stats.totalCustomers}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200"
          >
            <p className="text-sm text-stone-500">Clientes VIP</p>
            <p className="text-2xl font-bold text-amber-600">
              {stats.vipCustomers}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200"
          >
            <p className="text-sm text-stone-500">Nuevos (30 días)</p>
            <p className="text-2xl font-bold text-green-600">
              {stats.newCustomers}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200"
          >
            <p className="text-sm text-stone-500">Valor promedio</p>
            <p className="text-2xl font-bold text-stone-900">
              ${Math.round(stats.averageCustomerValue).toLocaleString("es-AR")}
            </p>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-stone-400" />
            <select
              value={segmentFilter}
              onChange={(e) =>
                setSegmentFilter(e.target.value as CustomerSegment | "all")
              }
              className="px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 bg-white"
            >
              <option value="all">Todos los segmentos</option>
              <option value="vip">VIP</option>
              <option value="regular">Regular</option>
              <option value="new">Nuevos</option>
              <option value="at-risk">En riesgo</option>
            </select>
          </div>
          <button
            onClick={() => toast.success("Exportando clientes...")}
            className="flex items-center gap-2 px-4 py-2.5 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
          >
            <Download className="h-5 w-5 text-stone-600" />
            <span className="text-stone-700">Exportar</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-2 space-y-4">
          {filteredCustomers.map((customer, index) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200"
            >
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() =>
                  setExpandedCustomer(
                    expandedCustomer === customer.id ? null : customer.id,
                  )
                }
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-yerba-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-yerba-700">
                      {customer.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-900">
                      {customer.name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-stone-500">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {customer.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {customer.phone}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <SegmentBadge segment={customer.segment} />
                  <div className="text-right">
                    <p className="font-semibold text-stone-900">
                      ${customer.totalSpent.toLocaleString("es-AR")}
                    </p>
                    <p className="text-sm text-stone-500">
                      {customer.orders} órdenes
                    </p>
                  </div>
                  {expandedCustomer === customer.id ? (
                    <ChevronUp className="h-5 w-5 text-stone-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-stone-400" />
                  )}
                </div>
              </div>

              <AnimatePresence>
                {expandedCustomer === customer.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-stone-100"
                  >
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-stone-400" />
                        <span className="text-sm text-stone-600">
                          {customer.orders} órdenes totales
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-stone-400" />
                        <span className="text-sm text-stone-600">
                          Valor promedio: $
                          {customer.orders > 0
                            ? Math.round(
                                customer.totalSpent / customer.orders,
                              ).toLocaleString("es-AR")
                            : 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-stone-400" />
                        <span className="text-sm text-stone-600">
                          Última orden: {customer.lastOrder}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          toast.success(`Email enviado a ${customer.email}`)
                        }
                        className="flex-1 px-4 py-2 bg-yerba-100 text-yerba-700 rounded-lg text-sm font-medium hover:bg-yerba-200"
                      >
                        Enviar email
                      </button>
                      <button
                        onClick={() =>
                          toast.success(`Llamando a ${customer.phone}...`)
                        }
                        className="flex-1 px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-200"
                      >
                        Llamar
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}

          {filteredCustomers.length === 0 && (
            <EmptyState
              title="No se encontraron clientes"
              description={
                searchTerm || segmentFilter !== "all"
                  ? "Probá con otros filtros de búsqueda"
                  : "No hay clientes en el sistema todavía"
              }
              icon={Users}
            />
          )}
        </div>

        {/* Sidebar - Charts */}
        <div className="space-y-6">
          {/* Segmentation Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
            <h3 className="font-semibold text-stone-900 mb-4">
              Segmentación de clientes
            </h3>
            {stats && (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(stats.segmentCounts).map(
                        ([key, value]) => ({
                          name: segmentConfig[key as CustomerSegment].label,
                          value,
                        }),
                      )}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      dataKey="value"
                    >
                      {Object.keys(stats.segmentCounts).map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            ["#f59e0b", "#3b82f6", "#22c55e", "#ef4444"][index]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="space-y-2">
              {stats &&
                Object.entries(stats.segmentCounts).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          key === "vip"
                            ? "bg-amber-500"
                            : key === "regular"
                              ? "bg-blue-500"
                              : key === "new"
                                ? "bg-green-500"
                                : "bg-red-500"
                        }`}
                      />
                      <span className="text-sm text-stone-600">
                        {segmentConfig[key as CustomerSegment].label}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-stone-900">
                      {value}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Top Customers */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
            <h3 className="font-semibold text-stone-900 mb-4">
              Mejores clientes
            </h3>
            <div className="space-y-4">
              {stats?.topCustomers.slice(0, 5).map((customer, index) => (
                <div key={customer.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yerba-100 rounded-full flex items-center justify-center text-sm font-bold text-yerba-700">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-stone-900">
                      {customer.name}
                    </p>
                    <p className="text-sm text-stone-500">
                      {customer.orders} órdenes
                    </p>
                  </div>
                  <span className="font-semibold text-stone-900">
                    ${customer.totalSpent.toLocaleString("es-AR")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
