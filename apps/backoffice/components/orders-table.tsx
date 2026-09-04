"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
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
  Eye,
  Phone,
  MapPin,
  RefreshCw,
  Link2,
} from "lucide-react";
import {
  useOrders,
  useOrder,
  useUpdateOrderStatus,
  useBulkUpdateOrderStatus,
  useImportShipping,
  useSetTrackingNumber,
  useOverrideOrderStatus,
  useOrderStateHistory,
  useShippingTracking,
  statusLabel,
  isPickupOrder,
  type Order,
  type OrderStatus,
  type SalesChannel,
  type StateChangeEntry,
  type ShippingTracking,
  type ShippingTrackingEvent,
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
import { CreatePaymentLinkModal } from "./create-payment-link-modal";
import { useMounted } from "@/hooks/use-mounted";
import {
  copyPaymentLink,
  useCreatePaymentLink,
} from "@/hooks/use-mp-payment-link";

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
function StatusBadge({
  status,
  pickup,
}: {
  status: OrderStatus;
  pickup?: boolean;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const label = statusLabel(status, { pickup });

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
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

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-6 w-full max-w-md mx-0 sm:mx-4 max-h-[100dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-stone-900">
              Cambio manual de estado
            </h2>
          </div>
          <button
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-stone-100 text-stone-500"
          >
            <X className="h-5 w-5" />
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
              className="flex-1 min-h-11 px-4 py-2 border border-stone-200 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!reason.trim() || override.isPending}
              className="flex-1 min-h-11 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {override.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldAlert className="h-4 w-4" />
              )}
              Aplicar cambio
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

// ─── State History Modal ────────────────────────────────────────────────────
const sourceLabels: Record<string, string> = {
  WEBHOOK_MERCADOPAGO: "Webhook MP",
  CARD_PAYMENT_API: "Pago con tarjeta",
  MANUAL_OVERRIDE: "Cambio manual",
  CLEANUP_TIMEOUT: "Limpieza automática",
  PAYMENT_REJECTED: "Pago rechazado",
  RECONCILIATION: "Reconciliación",
  SYSTEM_ERROR: "Error del sistema",
};

function StateHistoryModal({
  orderId,
  pickup,
  onClose,
}: {
  orderId: string;
  pickup?: boolean;
  onClose: () => void;
}) {
  const { data: history, isLoading } = useOrderStateHistory(orderId);

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-6 w-full max-w-lg mx-0 sm:mx-4 max-h-[100dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-stone-600" />
            <h2 className="text-lg font-semibold text-stone-900">
              Historial de estado
            </h2>
          </div>
          <button
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-stone-100 text-stone-500"
          >
            <X className="h-5 w-5" />
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
                      {entry.fromStatus
                        ? statusLabel(entry.fromStatus, { pickup })
                        : "—"}{" "}
                      → {statusLabel(entry.toStatus, { pickup })}
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
                      &ldquo;{entry.reason}&rdquo;
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>,
    document.body,
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
  const createPaymentLink = useCreatePaymentLink();
  const [copied, setCopied] = useState(false);
  const [mpLink, setMpLink] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const pickup = isPickupOrder(order);

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
      {
        label: pickup ? "Marcar listo para retiro" : "Marcar enviado",
        nextStatus: "SHIPPED",
        variant: "primary",
      },
      { label: "Cancelar", nextStatus: "CANCELLED", variant: "danger" },
    ],
    SHIPPED: [
      {
        label: pickup ? "Marcar retirado" : "Marcar entregado",
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
  const primaryActions = orderActions.filter(
    (a) => a.nextStatus !== "REFUNDED" && a.nextStatus !== "CANCELLED",
  );
  const cancelAction = orderActions.find((a) => a.nextStatus === "CANCELLED");
  const refundAction = orderActions.find((a) => a.nextStatus === "REFUNDED");
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
    <div className="flex flex-col gap-2">
      {/* Botones de estado — el reembolso va abajo, no como CTA principal */}
      <div className="flex flex-wrap items-center gap-2">
        {primaryActions.map((action, idx) => (
          <button
            key={idx}
            onClick={() => onUpdateStatus(orderId, action.nextStatus)}
            className="inline-flex min-h-11 items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-yerba-600 text-white hover:bg-yerba-700"
          >
            {action.label}
          </button>
        ))}
        {cancelAction ? (
          <button
            onClick={() => onUpdateStatus(orderId, cancelAction.nextStatus)}
            className="inline-flex min-h-11 items-center justify-center px-3 py-2 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50"
          >
            {cancelAction.label}
          </button>
        ) : null}
      </div>

      {status === "PENDING" ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={async () => {
              try {
                const data = await createPaymentLink.mutateAsync({ orderId });
                setMpLink(data.initPoint || data.sandboxInitPoint);
              } catch {
                // toast ya lo muestra el hook
              }
            }}
            disabled={createPaymentLink.isPending}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-sky-100 px-4 py-2 text-sm font-medium text-sky-800 hover:bg-sky-200 disabled:opacity-50"
          >
            {createPaymentLink.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando link…
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" />
                Generar link de Mercado Pago
              </>
            )}
          </button>
          {mpLink ? (
            <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
              <p className="break-all font-mono text-xs text-stone-800">{mpLink}</p>
              <button
                type="button"
                onClick={() => void copyPaymentLink(mpLink)}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-medium text-stone-800 ring-1 ring-stone-200 hover:bg-stone-100"
              >
                <Copy className="h-4 w-4" />
                Copiar
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Estado 1: aún no importado → botón "Importar a Correo Argentino" */}
      {isShippingOrder &&
        (status === "PAID" || status === "PROCESSING") &&
        !isImported && (
          <button
            onClick={() => importShipping.mutate(orderId)}
            disabled={importShipping.isPending}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors disabled:opacity-50"
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              type="text"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              placeholder="Ej: 000500076393019A3G0C701"
              className="w-full min-w-0 min-h-11 px-3 py-2 text-base font-mono border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-yerba-500"
              disabled={setTracking.isPending}
              maxLength={40}
            />
            <button
              onClick={handleSaveTracking}
              disabled={
                setTracking.isPending || trackingInput.trim().length < 8
              }
              className="inline-flex min-h-11 items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-yerba-600 text-white hover:bg-yerba-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
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
            después de imprimir la oblea.
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

      {/* Cambio manual + historial: secundarios, sin competir con el CTA */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5">
        <button
          onClick={() => onOverride(order)}
          title="Cambio manual de estado"
          className="inline-flex min-h-11 items-center gap-1 text-sm text-stone-500 hover:text-stone-800"
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          Cambio manual
        </button>
        <button
          onClick={() => onViewHistory(orderId)}
          title="Ver historial de cambios"
          className="inline-flex min-h-11 items-center gap-1 text-sm text-stone-500 hover:text-stone-800"
        >
          <History className="h-3.5 w-3.5" />
          Historial
        </button>
      </div>

      {refundAction ? (
        <button
          onClick={() => onUpdateStatus(orderId, refundAction.nextStatus)}
          className="inline-flex min-h-11 items-center self-start text-sm text-red-700/90 underline-offset-2 hover:underline"
        >
          Reembolsar
        </button>
      ) : null}
    </div>
  );
}


function primaryNextAction(order: Order): {
  label: string;
  nextStatus: OrderStatus;
} | null {
  const pickup = isPickupOrder(order);
  switch (order.status) {
    case "PENDING":
      return { label: "Marcar pagado", nextStatus: "PAID" };
    case "PAID":
      return { label: "Preparar", nextStatus: "PROCESSING" };
    case "PROCESSING":
      return {
        label: pickup ? "Listo para retiro" : "Marcar enviado",
        nextStatus: "SHIPPED",
      };
    case "SHIPPED":
      return {
        label: pickup ? "Marcar retirado" : "Marcar entregado",
        nextStatus: "DELIVERED",
      };
    default:
      return null;
  }
}

function OrderCard({
  order,
  selected,
  onToggleSelect,
  onOpen,
  onPrimaryAction,
}: {
  order: Order;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onPrimaryAction: (status: OrderStatus) => void;
}) {
  const name = order.customerName || order.user?.name || "Invitado";
  const pickup = isPickupOrder(order);
  const next = primaryNextAction(order);

  return (
    <article
      className={`rounded-2xl border bg-white p-3 shadow-sm ${
        selected ? "border-yerba-400 bg-yerba-50/40" : "border-stone-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="mt-1 h-5 w-5 rounded border-stone-300 text-yerba-600 focus:ring-yerba-500"
          aria-label={`Seleccionar orden ${order.id.slice(0, 8)}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-xs text-stone-500">
                #{order.id.slice(0, 8)}
              </p>
              <h3 className="truncate text-base font-semibold text-stone-900">
                {name}
              </h3>
            </div>
            <StatusBadge status={order.status} pickup={pickup} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-lg font-bold text-stone-900" suppressHydrationWarning>
              {money(order.total)}
            </p>
            <p className="text-sm text-stone-600">{deliveryLabel(order)}</p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-yerba-600 px-3 text-sm font-medium text-white hover:bg-yerba-700"
            >
              <Eye className="h-4 w-4" />
              Ver
            </button>
            {next ? (
              <button
                type="button"
                onClick={() => onPrimaryAction(next.nextStatus)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-stone-100 px-3 text-sm font-medium text-stone-800 hover:bg-stone-200"
              >
                {next.label}
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpen}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-stone-200 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Ficha
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function OrdersTable() {
  const { data: orders, isLoading, error, refetch } = useOrders();
  const updateStatus = useUpdateOrderStatus();
  const bulkUpdate = useBulkUpdateOrderStatus();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPaymentLinkOpen, setIsPaymentLinkOpen] = useState(false);
  const [overrideOrder, setOverrideOrder] = useState<Order | null>(null);
  const [historyOrderId, setHistoryOrderId] = useState<string | null>(null);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    const q = globalFilter.trim().toLowerCase();

    return orders.filter((order) => {
      const customerName = order.customerName || order.user?.name || "Invitado";
      const customerEmail = order.customerEmail || order.user?.email || "";
      const customerPhone = order.customerPhone || "";
      const shippingBits = [
        order.shippingStreetName,
        order.shippingStreetNumber,
        order.shippingCity,
        order.shippingZip,
        order.shippingAddress,
        order.shippingAgencyCode,
        order.trackingNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !q ||
        customerName.toLowerCase().includes(q) ||
        customerEmail.toLowerCase().includes(q) ||
        customerPhone.toLowerCase().includes(q) ||
        order.id.toLowerCase().includes(q) ||
        shippingBits.includes(q);

      const matchesStatus =
        statusFilter === "all" ||
        order.status.toLowerCase() === statusFilter.toLowerCase();

      const created = new Date(order.createdAt);
      const matchesFrom = !dateFrom || created >= new Date(`${dateFrom}T00:00:00`);
      const matchesTo = !dateTo || created <= new Date(`${dateTo}T23:59:59.999`);

      return matchesSearch && matchesStatus && matchesFrom && matchesTo;
    });
  }, [orders, globalFilter, statusFilter, dateFrom, dateTo]);

  // Handle status update
  const handleUpdateStatus = (id: string, status: OrderStatus) => {
    updateStatus.mutate({ id, status });
  };

  // Helper for Payment Method Label
  const getPaymentLabel = (method: string) => {
    const map: Record<string, string> = {
      MERCADOPAGO: "Mercado Pago",
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
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDetailOrderId(row.original.id);
            }}
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-yerba-700 hover:text-yerba-800"
          >
            <Eye className="h-3 w-3" />
            Ver
          </button>
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
          <StatusBadge
            status={row.original.status}
            pickup={isPickupOrder(row.original)}
          />
          {row.original.manualOverrideAt && (
            <span
              className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium"
              title={`Cambio manual: ${row.original.manualOverrideReason ?? "sin razón"}`}
            >
              <ShieldAlert className="h-2.5 w-2.5" />
              Cambio manual
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
          const isAgency = order.shippingDeliveryType === "S";
          return (
            <div className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-blue-600" />
              <div>
                <p className="text-xs font-medium text-stone-900">
                  {isAgency ? "Sucursal" : "Domicilio"}
                </p>
                {order.shippingCost ? (
                  <p className="text-[10px] text-stone-500">
                    ${Number(order.shippingCost).toLocaleString("es-AR")}
                  </p>
                ) : null}
                {isAgency && order.shippingAgencyCode ? (
                  <p
                    className="text-[10px] text-stone-500 truncate max-w-[140px]"
                    title={order.shippingAgencyCode}
                  >
                    Suc. {order.shippingAgencyCode}
                  </p>
                ) : null}
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
        pageSize: 20,
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
      <CreatePaymentLinkModal
        isOpen={isPaymentLinkOpen}
        onClose={() => setIsPaymentLinkOpen(false)}
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
          pickup={isPickupOrder(
            orders?.find((o) => o.id === historyOrderId) ?? { deliveryType: undefined },
          )}
          onClose={() => setHistoryOrderId(null)}
        />
      )}

      {detailOrderId && (
        <OrderDetailDrawer
          orderId={detailOrderId}
          onClose={() => setDetailOrderId(null)}
          onUpdateStatus={handleUpdateStatus}
          onOverride={setOverrideOrder}
          onViewHistory={setHistoryOrderId}
        />
      )}

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-stone-200 sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
              <input
                type="search"
                inputMode="search"
                placeholder="Buscar cliente, email o #orden..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full min-h-11 pl-10 pr-3 py-2.5 text-base border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 focus:border-transparent"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsPaymentLinkOpen(true)}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 px-3 py-2.5 bg-white text-stone-800 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors text-sm font-medium sm:px-4"
            >
              <Link2 className="h-5 w-5" />
              <span className="hidden sm:inline">Link de pago</span>
              <span className="sm:hidden">Link</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 px-3 py-2.5 bg-yerba-600 text-white rounded-xl hover:bg-yerba-700 transition-colors shadow-sm text-sm font-medium sm:px-4"
            >
              <CheckCircle className="h-5 w-5" />
              <span>Nueva Venta</span>
            </button>
          </div>

          <div className="flex items-center md:hidden">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-stone-700"
            >
              <Filter className="h-4 w-4" />
              Filtros
              {(statusFilter !== "all" || dateFrom || dateTo) && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-yerba-100 px-1.5 text-[11px] font-semibold text-yerba-800">
                  {
                    [
                      statusFilter !== "all",
                      Boolean(dateFrom),
                      Boolean(dateTo),
                    ].filter(Boolean).length
                  }
                </span>
              )}
            </button>
          </div>

          <div
            className={`${filtersOpen ? "flex" : "hidden"} flex-col gap-3 md:flex`}
          >
            <div className="flex w-full items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as OrderStatus | "all")
                }
                className="w-full min-h-11 px-4 py-2.5 text-base border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 bg-white"
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

            <DateRangeFields
              dateFrom={dateFrom}
              dateTo={dateTo}
              onFrom={setDateFrom}
              onTo={setDateTo}
            />

            <button
              type="button"
              onClick={() => exportOrdersCsv(filteredData)}
              className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-medium text-stone-600 hover:text-stone-900"
            >
              <Download className="h-4 w-4" />
              Exportar
            </button>
          </div>
        </div>

        {/* Bulk Actions - Human-Core: Clear selection feedback */}
        <AnimatePresence>
          {selectedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-stone-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm text-stone-600">
                {selectedCount} orden{selectedCount !== 1 ? "es" : ""}{" "}
                seleccionada{selectedCount !== 1 ? "s" : ""}
              </span>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => handleBulkAction("PAID")}
                  disabled={bulkUpdate.isPending}
                  className="inline-flex min-h-11 items-center justify-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 disabled:opacity-50"
                >
                  {bulkUpdate.isPending ? "Procesando..." : "Marcar pagadas"}
                </button>
                <button
                  onClick={() => handleBulkAction("CANCELLED")}
                  disabled={bulkUpdate.isPending}
                  className="inline-flex min-h-11 items-center justify-center px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 disabled:opacity-50"
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

      {/* Cards on phone — table from md up */}
      <div className="space-y-2.5 md:hidden">
        {table.getRowModel().rows.map((row) => (
          <OrderCard
            key={row.id}
            order={row.original}
            selected={row.getIsSelected()}
            onToggleSelect={() => row.toggleSelected()}
            onOpen={() => setDetailOrderId(row.original.id)}
            onPrimaryAction={(status) =>
              handleUpdateStatus(row.original.id, status)
            }
          />
        ))}
      </div>

      {/* Table - Agents-Ready: Semantic table structure */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
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
                  onClick={() => setDetailOrderId(row.original.id)}
                  className={`hover:bg-stone-50 transition-colors cursor-pointer ${row.getIsSelected() ? "bg-yerba-50" : ""}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-3 whitespace-nowrap"
                      onClick={
                        cell.column.id === "select" || cell.column.id === "actions"
                          ? (e) => e.stopPropagation()
                          : undefined
                      }
                    >
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
      </div>

      {table.getRowModel().rows.length === 0 && (
        <EmptyState
          title="No se encontraron órdenes"
          description={
            globalFilter || statusFilter !== "all" || dateFrom || dateTo
              ? "Probá con otros filtros de búsqueda"
              : "No hay órdenes en el sistema todavía"
          }
          icon={Search}
        />
      )}

      {table.getRowModel().rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              className="min-h-11 min-w-11 p-2 rounded-lg border border-stone-200 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="min-h-11 min-w-11 p-2 rounded-lg border border-stone-200 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers de entrega / CSV / ficha ──────────────────────────────────────

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const display = value
    ? new Date(`${value}T12:00:00`).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : label;

  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-medium text-stone-600">
        {label}
      </span>
      <span className="relative block">
        <span
          className={`flex min-h-11 items-center rounded-xl border border-stone-200 bg-white px-3 text-sm ${
            value ? "text-stone-900" : "text-stone-400"
          }`}
        >
          {display}
        </span>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </span>
    </label>
  );
}

function DateRangeFields({
  dateFrom,
  dateTo,
  onFrom,
  onTo,
}: {
  dateFrom: string;
  dateTo: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <DateField label="Desde" value={dateFrom} onChange={onFrom} />
      <DateField label="Hasta" value={dateTo} onChange={onTo} />
    </div>
  );
}

function deliveryLabel(order: Pick<Order, "deliveryType" | "shippingDeliveryType">) {
  if (order.deliveryType === "shipping") {
    return order.shippingDeliveryType === "S" ? "Sucursal" : "Domicilio";
  }
  return "Retiro";
}

function money(n: number | string | undefined | null) {
  return `$${Number(n ?? 0).toLocaleString("es-AR")}`;
}

function itemLineLabel(item: {
  quantity?: number;
  variant?: { name?: string; product?: { name?: string } };
}) {
  const product = item.variant?.product?.name ?? "Producto";
  const variant = item.variant?.name;
  const qty = item.quantity ?? 0;
  return variant ? `${product} (${variant}) x${qty}` : `${product} x${qty}`;
}

function exportOrdersCsv(list: Order[]) {
  const header = [
    "id",
    "fecha",
    "estado",
    "canal",
    "medioPago",
    "nombre",
    "email",
    "telefono",
    "entrega",
    "calle",
    "altura",
    "piso",
    "depto",
    "ciudad",
    "cp",
    "provincia",
    "sucursal",
    "tracking",
    "items",
    "total",
    "notas",
  ];
  const paymentMap: Record<string, string> = {
    MERCADOPAGO: "Mercado Pago",
    CASH: "Efectivo",
    TRANSFER: "Transferencia",
  };
  const rows = list.map((order) => {
    const pickup = isPickupOrder(order);
    return [
      order.id,
      new Date(order.createdAt).toLocaleString("es-AR"),
      statusLabel(order.status, { pickup }),
      channelConfig[order.channel || "ONLINE"]?.label ?? order.channel ?? "",
      paymentMap[order.paymentProvider] || order.paymentProvider,
      order.customerName || order.user?.name || "Invitado",
      order.customerEmail || order.user?.email || "",
      order.customerPhone || "",
      deliveryLabel(order),
      order.shippingStreetName || "",
      order.shippingStreetNumber || "",
      order.shippingFloor || "",
      order.shippingApartment || "",
      order.shippingCity || "",
      order.shippingZip || "",
      order.shippingProvinceCode || "",
      order.shippingAgencyCode || "",
      order.trackingNumber || "",
      (order.items ?? []).map((item) => itemLineLabel(item)).join(" | "),
      String(order.total),
      order.notes || "",
    ];
  });
  const esc = (v: string | null | undefined) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((r) => r.map(esc).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Cordoba",
  });
  a.download = `pedidos-yerbaxanaes-${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV de pedidos descargado");
}

const TRACKING_STATUS_LABELS: Record<string, string> = {
  delivered: "Entregado",
  entregado: "Entregado",
  in_transit: "En tránsito",
  "in transit": "En tránsito",
  intransit: "En tránsito",
  shipped: "Enviado",
  enviado: "Enviado",
  pending: "Pendiente",
  pendiente: "Pendiente",
  returned: "Devuelto",
  return: "Devuelto",
  cancelled: "Cancelado",
  canceled: "Cancelado",
  cancelado: "Cancelado",
  at_branch: "En sucursal",
  "at branch": "En sucursal",
  sucursal: "En sucursal",
  out_for_delivery: "En reparto",
  "out for delivery": "En reparto",
  received: "Recibido",
  recibido: "Recibido",
  posted: "Admitido",
  admitted: "Admitido",
  admitido: "Admitido",
  processing: "En proceso",
  exception: "Incidencia",
  failed: "Fallido",
  available: "Disponible para retiro",
  ready_for_pickup: "Listo para retiro",
};

function trackingStatusLabel(raw?: string | null): string | null {
  if (!raw || !String(raw).trim()) return null;
  const trimmed = String(raw).trim();
  const key = trimmed.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  const compact = key.replace(/ /g, "_");
  return (
    TRACKING_STATUS_LABELS[key] ||
    TRACKING_STATUS_LABELS[compact] ||
    TRACKING_STATUS_LABELS[trimmed.toLowerCase()] ||
    trimmed
  );
}

function formatTrackingDate(raw?: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString("es-AR");
}

function CorreoTrackingPanel({ order }: { order: Order }) {
  const consult = useShippingTracking();
  const hasNumber = !!order.trackingNumber?.trim();

  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
        Seguimiento Correo Argentino
      </h3>
      <div className="bg-stone-50 rounded-xl p-3 space-y-2">
        <button
          type="button"
          disabled={!hasNumber || consult.isPending}
          onClick={() => consult.mutate(order.id)}
          className="inline-flex min-h-11 items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {consult.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Consultar tracking
        </button>

        {!hasNumber && (
          <p className="text-xs text-amber-800 leading-snug">
            Tenés que pegar el número de seguimiento desde MiCorreo. La
            importación no lo trae.
          </p>
        )}

        {consult.isError && (
          <p className="text-xs text-red-600">
            {consult.error instanceof Error
              ? consult.error.message
              : "No se pudo consultar el tracking"}
          </p>
        )}

        {consult.data ? <CorreoTrackingResult data={consult.data} /> : null}
      </div>
    </section>
  );
}

function CorreoTrackingResult({ data }: { data: ShippingTracking }) {
  const events = Array.isArray(data.events) ? data.events : [];

  return (
    <div className="space-y-2 pt-1">
      {data.trackingNumber ? (
        <p className="text-xs text-stone-700">
          <span className="text-stone-500">Número: </span>
          <span className="font-mono">{data.trackingNumber}</span>
        </p>
      ) : null}

      {data.message ? (
        <p className="text-xs text-stone-600">{data.message}</p>
      ) : null}

      {events.length === 0 && !data.message ? (
        <p className="text-xs text-stone-500">
          No hay movimientos de tracking todavía.
        </p>
      ) : null}

      {events.length > 0 ? (
        <ol className="relative border-l border-stone-200 ml-2 space-y-3">
          {events.map((ev, idx) => (
            <CorreoTrackingEventItem key={idx} event={ev} />
          ))}
        </ol>
      ) : null}

      {data.trackingUrl ? (
        <a
          href={data.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-yerba-700 hover:underline"
        >
          Ver en Correo Argentino
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}
    </div>
  );
}

function CorreoTrackingEventItem({
  event,
}: {
  event: ShippingTrackingEvent;
}) {
  const estado = trackingStatusLabel(event.status || event.event);
  const fecha = formatTrackingDate(event.date);
  const sucursal = event.branch?.trim() || null;
  const extraEvent =
    event.status && event.event && event.event !== event.status
      ? trackingStatusLabel(event.event)
      : null;

  if (!estado && !fecha && !sucursal && !extraEvent) {
    return (
      <li className="ml-3 text-xs text-stone-500">
        Sin datos en este movimiento
      </li>
    );
  }

  return (
    <li className="ml-3">
      <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-blue-300 border-2 border-white" />
      <div className="text-xs space-y-0.5">
        {estado ? (
          <p className="font-medium text-stone-800">
            <span className="text-stone-500 font-normal">Estado: </span>
            {estado}
          </p>
        ) : null}
        {fecha ? (
          <p className="text-stone-600">
            <span className="text-stone-500">Fecha: </span>
            {fecha}
          </p>
        ) : null}
        {sucursal ? (
          <p className="text-stone-600">
            <span className="text-stone-500">Sucursal: </span>
            {sucursal}
          </p>
        ) : null}
        {extraEvent ? (
          <p className="text-stone-600">
            <span className="text-stone-500">Evento: </span>
            {extraEvent}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function OrderDetailDrawer({
  orderId,
  onClose,
  onUpdateStatus,
  onOverride,
  onViewHistory,
}: {
  orderId: string;
  onClose: () => void;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onOverride: (order: Order) => void;
  onViewHistory: (orderId: string) => void;
}) {
  const { data: order, isLoading, error, refetch } = useOrder(orderId);
  const pickup = order ? isPickupOrder(order) : false;

  const paymentMap: Record<string, string> = {
    MERCADOPAGO: "Mercado Pago",
    CASH: "Efectivo",
    TRANSFER: "Transferencia",
  };

  const mounted = useMounted();

  // Bloquea el scroll de fondo mientras el drawer esta abierto.
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="absolute inset-0 z-[1] flex flex-col overflow-hidden bg-[#faf7f2] pb-[env(safe-area-inset-bottom,0px)] md:left-auto md:w-full md:max-w-lg md:bg-white md:shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-stone-900">
              Ficha del pedido
            </h2>
            <p className="text-xs text-stone-500 font-mono">
              {orderId.slice(0, 8)}…
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100"
            aria-label="Cerrar ficha"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-5 sm:px-5">
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
              <span className="ml-2 text-sm text-stone-500">
                Cargando pedido…
              </span>
            </div>
          )}

          {error && !isLoading && (
            <div className="text-center py-10 space-y-3">
              <p className="text-sm text-red-600">
                No se pudo cargar el pedido.
              </p>
              <p className="text-xs text-stone-500">
                {error instanceof Error ? error.message : "Error desconocido"}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-3 py-1.5 text-sm rounded-lg bg-stone-100 hover:bg-stone-200"
              >
                Reintentar
              </button>
            </div>
          )}

          {order && (
            <>
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={order.status} pickup={pickup} />
                  <span className="text-xs text-stone-500">
                    {new Date(order.createdAt).toLocaleString("es-AR")}
                  </span>
                </div>
                <p className="text-sm text-stone-700">
                  <span className="text-stone-500">Pago: </span>
                  {paymentMap[order.paymentProvider] || order.paymentProvider}
                </p>
                <p className="text-sm text-stone-700">
                  <span className="text-stone-500">Canal: </span>
                  {channelConfig[order.channel || "ONLINE"]?.label ?? "Online"}
                </p>
                {order.mpPaymentId ? (
                  <p className="text-sm text-stone-700">
                    <span className="text-stone-500">ID Mercado Pago: </span>
                    <span className="font-mono text-xs">{order.mpPaymentId}</span>
                  </p>
                ) : null}
                <p className="text-lg font-semibold text-stone-900">
                  {money(order.total)}
                </p>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                  Contacto
                </h3>
                <div className="bg-stone-50 rounded-xl p-3 space-y-1.5 text-sm">
                  <p className="font-medium text-stone-900">
                    {order.customerName || order.user?.name || "Invitado"}
                  </p>
                  <p className="text-stone-600">
                    {order.customerEmail || order.user?.email || "Sin email"}
                  </p>
                  {order.customerPhone ? (
                    <a
                      href={`tel:${order.customerPhone}`}
                      className="inline-flex items-center gap-1.5 text-yerba-700 hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {order.customerPhone}
                    </a>
                  ) : (
                    <p className="text-stone-400">Sin teléfono</p>
                  )}
                  {order.notes ? (
                    <p className="text-stone-600 pt-1 border-t border-stone-200">
                      <span className="text-stone-500">Notas: </span>
                      {order.notes}
                    </p>
                  ) : null}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                  Entrega
                </h3>
                <div className="bg-stone-50 rounded-xl p-3 space-y-1.5 text-sm text-stone-700">
                  <p className="font-medium">{deliveryLabel(order)}</p>
                  {order.deliveryType === "shipping" ? (
                    <>
                      <p className="inline-flex items-start gap-1.5">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 text-stone-400 shrink-0" />
                        <span>
                          {[order.shippingStreetName, order.shippingStreetNumber]
                            .filter(Boolean)
                            .join(" ")}
                          {order.shippingFloor || order.shippingApartment
                            ? ` · Piso ${order.shippingFloor ?? "—"} Depto ${order.shippingApartment ?? "—"}`
                            : ""}
                          {order.shippingAddress &&
                          !order.shippingStreetName
                            ? ` ${order.shippingAddress}`
                            : ""}
                        </span>
                      </p>
                      <p>
                        {[order.shippingCity, order.shippingZip, order.shippingProvinceCode]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {order.shippingDeliveryType === "S" &&
                      order.shippingAgencyCode ? (
                        <p>Sucursal {order.shippingAgencyCode}</p>
                      ) : null}
                      {order.shippingCost != null ? (
                        <p>Envío: {money(order.shippingCost)}</p>
                      ) : null}
                      {order.trackingNumber ? (
                        <p className="flex items-center gap-2">
                          <span className="font-mono text-xs">
                            {order.trackingNumber}
                          </span>
                          <a
                            href={`https://www.correoargentino.com.ar/formularios/oas?id=${order.trackingNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-yerba-700 hover:underline inline-flex items-center gap-1"
                          >
                            OAS <ExternalLink className="h-3 w-3" />
                          </a>
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-stone-500">Retiro en el local</p>
                  )}
                </div>
              </section>

              {order.deliveryType === "shipping" &&
              (!!order.correoImportedAt || !!order.trackingNumber) ? (
                <CorreoTrackingPanel
                  key={`${order.id}-${order.trackingNumber ?? ""}`}
                  order={order}
                />
              ) : null}

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                  Productos
                </h3>
                <ul className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
                  {(order.items ?? []).length === 0 && (
                    <li className="px-3 py-3 text-sm text-stone-500">
                      Sin ítems
                    </li>
                  )}
                  {(order.items ?? []).map((item, idx) => {
                    const unit = Number(item.price ?? 0);
                    const qty = item.quantity ?? 0;
                    return (
                      <li
                        key={item.id ?? idx}
                        className="px-3 py-2.5 flex items-start justify-between gap-3 text-sm"
                      >
                        <div>
                          <p className="font-medium text-stone-900">
                            {item.variant?.product?.name ?? "Producto"}
                          </p>
                          {item.variant?.name ? (
                            <p className="text-xs text-stone-500">
                              {item.variant.name}
                            </p>
                          ) : null}
                          <p className="text-xs text-stone-500">
                            {qty} × {money(unit)}
                          </p>
                        </div>
                        <p className="font-semibold text-stone-900">
                          {money(unit * qty)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </>
          )}
        </div>

        {order && (
          <div className="border-t border-stone-200 bg-[#faf7f2] px-4 py-3 sm:px-5 md:bg-white">
            <OrderActions
              order={order}
              onUpdateStatus={onUpdateStatus}
              onOverride={onOverride}
              onViewHistory={onViewHistory}
            />
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

