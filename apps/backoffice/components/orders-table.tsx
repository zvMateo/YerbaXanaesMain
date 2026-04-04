"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  ExternalLink,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import {
  useOrders,
  useUpdateOrderStatus,
  useBulkUpdateOrderStatus,
  useImportShipping,
  type Order,
  type OrderStatus,
} from "@/hooks/use-orders";
import { OrdersSkeleton } from "./skeletons";
import { EmptyState, ErrorState } from "./empty-states";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { toast } from "sonner";

// Status configurations - Systems-Oriented: Consistent status styling
const statusConfig: Record<
  OrderStatus,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  PENDING: {
    label: "Pendiente",
    icon: Clock,
    color: "text-amber-700",
    bg: "bg-amber-100",
  },
  PAID: {
    label: "Pagado",
    icon: CheckCircle,
    color: "text-blue-700",
    bg: "bg-blue-100",
  },
  REJECTED: {
    label: "Rechazado",
    icon: XCircle,
    color: "text-orange-700",
    bg: "bg-orange-100",
  },
  CANCELLED: {
    label: "Cancelado",
    icon: XCircle,
    color: "text-red-700",
    bg: "bg-red-100",
  },
  REFUNDED: {
    label: "Reembolsado",
    icon: Package,
    color: "text-purple-700",
    bg: "bg-purple-100",
  },
};

// Status Badge Component
function StatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status];
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

// Action Buttons Component
function OrderActions({
  order,
  onUpdateStatus,
}: {
  order: Order;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
}) {
  const { status, id: orderId } = order;
  const importShipping = useImportShipping();
  const [copied, setCopied] = useState(false);

  const actions: Record<
    OrderStatus,
    Array<{
      label: string;
      nextStatus: OrderStatus;
      variant: "primary" | "secondary" | "danger";
    }>
  > = {
    PENDING: [
      { label: "Marcar pagado", nextStatus: "PAID", variant: "primary" },
      { label: "Cancelar", nextStatus: "CANCELLED", variant: "danger" },
    ],
    PAID: [
      { label: "Reembolsar", nextStatus: "REFUNDED", variant: "secondary" },
      { label: "Cancelar", nextStatus: "CANCELLED", variant: "danger" },
    ],
    REJECTED: [
      { label: "Cancelar", nextStatus: "CANCELLED", variant: "danger" },
    ],
    REFUNDED: [],
    CANCELLED: [],
  };

  const orderActions = actions[status] || [];
  const isShippingOrder = order.deliveryType === "shipping";
  const hasTracking = !!order.trackingNumber;

  const handleCopyTracking = () => {
    if (order.trackingNumber) {
      navigator.clipboard.writeText(order.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {/* Botones de estado */}
      <div className="flex items-center gap-1.5">
        {orderActions.map((action, idx) => (
          <button
            key={idx}
            onClick={() => onUpdateStatus(orderId, action.nextStatus)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${action.variant === "primary" ? "bg-yerba-600 text-white hover:bg-yerba-700" : ""}
              ${action.variant === "secondary" ? "bg-stone-100 text-stone-700 hover:bg-stone-200" : ""}
              ${action.variant === "danger" ? "bg-red-100 text-red-700 hover:bg-red-200" : ""}
            `}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Botón importar a Correo Argentino (solo si es envío y no fue importado) */}
      {isShippingOrder && status === "PAID" && !hasTracking && (
        <button
          onClick={() => importShipping.mutate(orderId)}
          disabled={importShipping.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors disabled:opacity-50"
        >
          {importShipping.isPending ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Importando...
            </>
          ) : (
            <>
              <Truck className="h-3 w-3" />
              Importar a Correo Argentino
            </>
          )}
        </button>
      )}

      {/* Tracking info si ya fue importado */}
      {hasTracking && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-stone-50 rounded-lg">
          <Truck className="h-3 w-3 text-stone-500" />
          <span className="text-xs text-stone-700 font-mono">
            {order.trackingNumber}
          </span>
          <button
            onClick={handleCopyTracking}
            className="p-0.5 hover:text-yerba-600 transition-colors"
            title="Copiar número"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
          <a
            href={`https://www.correoargentino.com.ar/formularios/oas?id=${order.trackingNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-0.5 hover:text-yerba-600 transition-colors"
            title="Ver seguimiento"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}

export function OrdersTable() {
  const { data: orders, isLoading, error, refetch } = useOrders();
  const updateStatus = useUpdateOrderStatus();
  const bulkUpdate = useBulkUpdateOrderStatus();

  const handleBulkAction = (status: OrderStatus) => {
    const selectedIds = table
      .getSelectedRowModel()
      .rows.map((r) => r.original.id);
    bulkUpdate.mutate(
      { ids: selectedIds, status: status.toUpperCase() as OrderStatus },
      {
        onSuccess: () => {
          table.resetRowSelection();
          toast.success(`${selectedIds.length} órdenes actualizadas`);
        },
      },
    );
  };

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  // Filter data
  const filteredData = useMemo(() => {
    if (!orders) return [];

    return orders.filter((order) => {
      const customerName = order.customerName || order.user?.name || "Invitado";
      const customerEmail = order.customerEmail || order.user?.email || "";

      const matchesSearch =
        customerName.toLowerCase().includes(globalFilter.toLowerCase()) ||
        customerEmail.toLowerCase().includes(globalFilter.toLowerCase()) ||
        order.id.toLowerCase().includes(globalFilter.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        order.status.toLowerCase() === statusFilter.toLowerCase(); // Case insensitive compare

      return matchesSearch && matchesStatus;
    });
  }, [orders, globalFilter, statusFilter]);

  // Handle status update
  const handleUpdateStatus = (id: string, status: OrderStatus) => {
    updateStatus.mutate({ id, status });
  };

  // Helper for Payment Method Label
  const getPaymentLabel = (method: string) => {
    const map: Record<string, string> = {
      MERCADOPAGO: "MercadoPago",
      CASH: "Efectivo",
      TRANSFER: "Transferencia",
    };
    return map[method] || method;
  };

  // Define columns
  const columns: ColumnDef<Order>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="rounded border-stone-300 text-yerba-600 focus:ring-yerba-500"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="rounded border-stone-300 text-yerba-600 focus:ring-yerba-500"
        />
      ),
    },
    {
      accessorKey: "id",
      header: "Orden",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-stone-900 font-mono text-xs">
            {row.original.id.slice(0, 8)}...
          </p>
          <p className="text-xs text-stone-500">
            {new Date(row.original.createdAt).toLocaleDateString("es-AR")}
          </p>
        </div>
      ),
    },
    {
      id: "customer",
      header: "Cliente",
      cell: ({ row }) => {
        const name =
          row.original.customerName || row.original.user?.name || "Invitado";
        const email =
          row.original.customerEmail || row.original.user?.email || "Sin email";
        return (
          <div>
            <p className="font-medium text-stone-900">{name}</p>
            <p className="text-xs text-stone-500">{email}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "items",
      header: "Items",
      cell: ({ row }) => (
        <span className="text-stone-600">
          {row.original.items?.length || 0} productos
        </span>
      ),
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-semibold text-stone-900" suppressHydrationWarning>
          ${Number(row.original.total).toLocaleString("es-AR")}
        </span>
      ),
    },
    {
      accessorKey: "paymentProvider",
      header: "Pago",
      cell: ({ row }) => (
        <span className="text-sm text-stone-600">
          {getPaymentLabel(row.original.paymentProvider)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "deliveryType",
      header: "Entrega",
      cell: ({ row }) => {
        const order = row.original;
        if (order.deliveryType === "shipping") {
          return (
            <div className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-blue-600" />
              <div>
                <p className="text-xs font-medium text-stone-900">Envío</p>
                {order.shippingCost && (
                  <p className="text-[10px] text-stone-500">
                    ${Number(order.shippingCost).toLocaleString("es-AR")}
                  </p>
                )}
              </div>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-stone-400" />
            <p className="text-xs text-stone-500">Retiro</p>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <OrderActions
          order={row.original}
          onUpdateStatus={handleUpdateStatus}
        />
      ),
    },
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  });

  const selectedCount = table.getSelectedRowModel().rows.length;

  // Loading state
  if (isLoading) {
    return <OrdersSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title="Error al cargar órdenes"
        message={error.message}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Toolbar - Generative UI: Adaptive interface */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, email o número de orden..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-stone-400" />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as OrderStatus | "all")
              }
              className="px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 bg-white"
            >
              <option value="all">Todos los estados</option>
              <option value="PENDING">Pendientes</option>
              <option value="PAID">Pagados</option>
              <option value="REJECTED">Rechazados</option>
              <option value="CANCELLED">Cancelados</option>
              <option value="REFUNDED">Reembolsados</option>
            </select>
          </div>

          {/* Export */}
          <button
            onClick={() => toast.success("Exportando órdenes...")}
            className="flex items-center gap-2 px-4 py-2.5 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
          >
            <Download className="h-5 w-5 text-stone-600" />
            <span className="text-stone-700">Exportar</span>
          </button>
        </div>

        {/* Bulk Actions - Human-Core: Clear selection feedback */}
        <AnimatePresence>
          {selectedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-stone-200 flex items-center justify-between"
            >
              <span className="text-sm text-stone-600">
                {selectedCount} orden{selectedCount !== 1 ? "es" : ""}{" "}
                seleccionada{selectedCount !== 1 ? "s" : ""}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction("PAID")}
                  disabled={bulkUpdate.isPending}
                  className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 disabled:opacity-50"
                >
                  {bulkUpdate.isPending ? "Procesando..." : "Marcar pagadas"}
                </button>
                <button
                  onClick={() => handleBulkAction("CANCELLED")}
                  disabled={bulkUpdate.isPending}
                  className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 disabled:opacity-50"
                >
                  {bulkUpdate.isPending
                    ? "Procesando..."
                    : "Cancelar seleccionadas"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Table - Agents-Ready: Semantic table structure */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider cursor-pointer hover:bg-stone-100 transition-colors"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.getIsSorted() && (
                          <span className="text-yerba-600">
                            {header.column.getIsSorted() === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-stone-100">
              {table.getRowModel().rows.map((row, index) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`hover:bg-stone-50 transition-colors ${row.getIsSelected() ? "bg-yerba-50" : ""}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {table.getRowModel().rows.length === 0 && (
          <EmptyState
            title="No se encontraron órdenes"
            description={
              globalFilter || statusFilter !== "all"
                ? "Probá con otros filtros de búsqueda"
                : "No hay órdenes en el sistema todavía"
            }
            icon={Search}
          />
        )}

        {/* Pagination - Systems-Oriented: Clear navigation */}
        <div className="px-4 py-3 border-t border-stone-200 flex items-center justify-between">
          <div className="text-sm text-stone-600">
            Mostrando{" "}
            {table.getState().pagination.pageIndex *
              table.getState().pagination.pageSize +
              1}{" "}
            a{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
              filteredData.length,
            )}{" "}
            de {filteredData.length} resultados
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-2 rounded-lg border border-stone-200 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm text-stone-600">
              Página {table.getState().pagination.pageIndex + 1} de{" "}
              {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-2 rounded-lg border border-stone-200 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
