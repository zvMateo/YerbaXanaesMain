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
  ShieldAlert,
  History,
  X,
} from "lucide-react";
import {
  useOrders,
  useUpdateOrderStatus,
  useBulkUpdateOrderStatus,
  useImportShipping,
  useSetTrackingNumber,
  useOverrideOrderStatus,
  useOrderStateHistory,
  type Order,
  type OrderStatus,
  type SalesChannel,
  type StateChangeEntry,
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
import { CreateOrderModal } from "./create-order-modal";

const channelConfig: Record<
  SalesChannel,
  { label: string; icon: string; color: string }
> = {
  ONLINE: {
    label: "Online",
    icon: "🛒",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  STORE: {
    label: "Tienda",
    icon: "🏪",
    color: "bg-stone-100 text-stone-700 border-stone-200",
  },
  INSTAGRAM: {
    label: "Instagram",
    icon: "📸",
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
  WHATSAPP: {
    label: "WhatsApp",
    icon: "💬",
    color: "bg-green-100 text-green-700 border-green-200",
  },
  FAIR: {
    label: "Feria",
    icon: "🎪",
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
};

function ChannelBadge({ channel }: { channel?: SalesChannel }) {
  const config = channelConfig[channel || "ONLINE"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${config.color}`}
      title={config.label}
    >
      <span className="text-sm">{config.icon}</span>
      {config.label}
    </span>
  );
}

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
  PROCESSING: {
    label: "Preparando",
    icon: Package,
    color: "text-indigo-700",
    bg: "bg-indigo-100",
  },
  SHIPPED: {
    label: "Enviado",
    icon: Truck,
    color: "text-cyan-700",
    bg: "bg-cyan-100",
  },
  DELIVERED: {
    label: "Entregado",
    icon: CheckCircle,
    color: "text-green-700",
    bg: "bg-green-100",
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

// ─── Override Modal ────────────────────────────────────────────────────────
const OVERRIDEABLE_STATUSES: OrderStatus[] = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "REJECTED",
  "CANCELLED",
  "REFUNDED",
];

function OverrideStatusModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const override = useOverrideOrderStatus();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(
    order.status,
  );
  const [reason, setReason] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    override.mutate(
      { orderId: order.id, status: selectedStatus, reason: reason.trim() },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-stone-900">
              Override manual de estado
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-stone-500 mb-5">
          Este cambio quedará auditado y el webhook de Mercado Pago no lo
          revertirá.
          <span className="block mt-1 text-amber-600 font-medium">
            Orden #{order.id.slice(0, 8)}
          </span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Nuevo estado
            </label>
            <select
              value={selectedStatus}
              onChange={(e) =>
                setSelectedStatus(e.target.value as OrderStatus)
              }
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-yerba-500 focus:border-transparent"
            >
              {OVERRIDEABLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusConfig[s]?.label ?? s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Razón del cambio{" "}
              <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Ej: Cliente confirmó transferencia. Ej: Cliente solicitó cancelación."
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-yerba-500 focus:border-transparent resize-none"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-stone-200 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!reason.trim() || override.isPending}
              className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {override.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldAlert className="h-4 w-4" />
              )}
              Aplicar override
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── State History Modal ────────────────────────────────────────────────────
const sourceLabels: Record<string, string> = {
  WEBHOOK_MERCADOPAGO: "Webhook MP",
  CARD_PAYMENT_API: "Pago con tarjeta",
  MANUAL_OVERRIDE: "Override manual",
  CLEANUP_TIMEOUT: "Limpieza automática",
  PAYMENT_REJECTED: "Pago rechazado",
  RECONCILIATION: "Reconciliación",
  SYSTEM_ERROR: "Error del sistema",
};

function StateHistoryModal({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) {
  const { data: history, isLoading } = useOrderStateHistory(orderId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-stone-600" />
            <h2 className="text-lg font-semibold text-stone-900">
              Historial de estado
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-stone-500 mb-4">
          Orden #{orderId.slice(0, 8)}
        </p>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
          </div>
        )}

        {!isLoading && (!history || history.length === 0) && (
          <p className="text-sm text-stone-500 text-center py-8">
            Sin registros de cambios de estado aún.
          </p>
        )}

        {!isLoading && history && history.length > 0 && (
          <ol className="relative border-l border-stone-200 ml-3 space-y-6">
            {history.map((entry: StateChangeEntry) => (
              <li key={entry.id} className="ml-4">
                <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-stone-300 border-2 border-white" />
                <div className="bg-stone-50 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-stone-700">
                      {entry.fromStatus ?? "—"} → {entry.toStatus}
                    </span>
                    <span className="text-[10px] text-stone-400 shrink-0">
                      {new Date(entry.createdAt).toLocaleString("es-AR")}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mb-1">
                    <span className="font-medium text-stone-600">
                      {sourceLabels[entry.source] ?? entry.source}
                    </span>
                    {entry.changedByEmail && (
                      <> · {entry.changedByEmail}</>
                    )}
                  </p>
                  {entry.reason && (
                    <p className="text-xs text-stone-500 italic">
                      "{entry.reason}"
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

// Action Buttons Component
function OrderActions({
  order,
  onUpdateStatus,
  onOverride,
  onViewHistory,
}: {
  order: Order;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onOverride: (order: Order) => void;
  onViewHistory: (orderId: string) => void;
}) {
  const { status, id: orderId } = order;
  const importShipping = useImportShipping();
  const setTracking = useSetTrackingNumber();
  const [copied, setCopied] = useState(false);
  const [trackingInput, setTrackingInput] = useState("");

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
      { label: "Preparar", nextStatus: "PROCESSING", variant: "primary" },
      { label: "Reembolsar", nextStatus: "REFUNDED", variant: "secondary" },
      { label: "Cancelar", nextStatus: "CANCELLED", variant: "danger" },
    ],
    PROCESSING: [
      { label: "Marcar enviado", nextStatus: "SHIPPED", variant: "primary" },
      { label: "Cancelar", nextStatus: "CANCELLED", variant: "danger" },
    ],
    SHIPPED: [
      {
        label: "Marcar entregado",
        nextStatus: "DELIVERED",
        variant: "primary",
      },
    ],
    DELIVERED: [
      { label: "Reembolsar", nextStatus: "REFUNDED", variant: "secondary" },
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
  const isImported = !!order.correoImportedAt;

  const handleCopyTracking = () => {
    if (order.trackingNumber) {
      navigator.clipboard.writeText(order.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveTracking = () => {
    const trimmed = trackingInput.trim();
    if (!trimmed) return;
    setTracking.mutate(
      { orderId, trackingNumber: trimmed },
      {
        onSuccess: () => setTrackingInput(""),
      },
    );
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

      {/* Estado 1: aún no importado → botón "Importar a Correo Argentino" */}
      {isShippingOrder &&
        (status === "PAID" || status === "PROCESSING") &&
        !isImported && (
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

      {/* Estado 2: importado pero sin tracking → input para cargarlo manualmente */}
      {isImported && !hasTracking && (
        <div className="flex flex-col gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-1.5 text-xs text-amber-800">
            <Truck className="h-3 w-3" />
            <span className="font-medium">
              Cargá el número de seguimiento de MiCorreo
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              placeholder="Ej: 000500076393019A3G0C701"
              className="flex-1 px-2 py-1 text-xs font-mono border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-yerba-500"
              disabled={setTracking.isPending}
              maxLength={40}
            />
            <button
              onClick={handleSaveTracking}
              disabled={
                setTracking.isPending || trackingInput.trim().length < 8
              }
              className="px-3 py-1 rounded text-xs font-medium bg-yerba-600 text-white hover:bg-yerba-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {setTracking.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Guardar"
              )}
            </button>
          </div>
          <p className="text-[10px] text-amber-700 leading-snug">
            Encontrá el número en{" "}
            <a
              href="https://www.correoargentino.com.ar/MiCorreo/public/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-900"
            >
              MiCorreo
            </a>{" "}
            después de imprimir la doblea.
          </p>
        </div>
      )}

      {/* Estado 3: tracking cargado → mostrar número + acciones */}
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

      {/* Override manual + historial */}
      <div className="flex items-center gap-1.5 pt-0.5">
        <button
          onClick={() => onOverride(order)}
          title="Override manual de estado"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors border border-amber-200"
        >
          <ShieldAlert className="h-3 w-3" />
          Override
        </button>
        <button
          onClick={() => onViewHistory(orderId)}
          title="Ver historial de cambios"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-stone-50 text-stone-600 hover:bg-stone-100 transition-colors border border-stone-200"
        >
          <History className="h-3 w-3" />
          Historial
        </button>
      </div>
    </div>
  );
}

export function OrdersTable() {
  const { data: orders, isLoading, error, refetch } = useOrders();
  const updateStatus = useUpdateOrderStatus();
  const bulkUpdate = useBulkUpdateOrderStatus();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [overrideOrder, setOverrideOrder] = useState<Order | null>(null);
  const [historyOrderId, setHistoryOrderId] = useState<string | null>(null);

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
      accessorKey: "channel",
      header: "Canal",
      cell: ({ row }) => <ChannelBadge channel={row.original.channel} />,
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={row.original.status} />
          {row.original.manualOverrideAt && (
            <span
              className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium"
              title={`Override manual: ${row.original.manualOverrideReason ?? "sin razón"}`}
            >
              <ShieldAlert className="h-2.5 w-2.5" />
              Override manual
            </span>
          )}
        </div>
      ),
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
          onOverride={setOverrideOrder}
          onViewHistory={setHistoryOrderId}
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
      <CreateOrderModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {overrideOrder && (
        <OverrideStatusModal
          order={overrideOrder}
          onClose={() => setOverrideOrder(null)}
        />
      )}

      {historyOrderId && (
        <StateHistoryModal
          orderId={historyOrderId}
          onClose={() => setHistoryOrderId(null)}
        />
      )}

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
              <option value="PROCESSING">Preparando</option>
              <option value="SHIPPED">Enviados</option>
              <option value="DELIVERED">Entregados</option>
              <option value="REJECTED">Rechazados</option>
              <option value="CANCELLED">Cancelados</option>
              <option value="REFUNDED">Reembolsados</option>
            </select>
          </div>

          {/* Nueva Venta */}
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-yerba-600 text-white rounded-xl hover:bg-yerba-700 transition-colors shadow-sm font-medium"
          >
            <CheckCircle className="h-5 w-5" />
            <span>Nueva Venta</span>
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
