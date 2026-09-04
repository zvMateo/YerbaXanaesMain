"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import {
  Banknote,
  Building2,
  Check,
  Copy,
  Loader2,
  MessageCircle,
  Store,
  Wallet,
} from "lucide-react";
import { CheckoutFormData } from "@/schemas/checkout-schema";
import { useCartStore } from "@/stores/cart-store";
import { brand, shippingWhatsappUrl } from "@/lib/brand";
import { buildPublicCheckoutPayload } from "@/lib/checkout-payload";
import { ApiEnvelope, OfflineCheckoutResult, TransferInstructions } from "@repo/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type PaymentMethodSelectorProps = {
  amount: number;
  isPickup: boolean;
  existingOrderId?: string | null;
  onOfflineSuccess: (data: {
    orderId: string;
    method: "transfer" | "cash";
  }) => void;
};

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado`);
  } catch {
    toast.error("No se pudo copiar. Seleccioná el texto a mano.");
  }
}

function formatArs(amount: number) {
  return amount.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  });
}

function isTestTransferData(instructions: TransferInstructions) {
  if (instructions.test) return true;
  const blob = `${instructions.holder ?? ""} ${instructions.alias ?? ""}`.toLowerCase();
  return blob.includes("prueba");
}

function TransferFields({
  instructions,
}: {
  instructions: TransferInstructions;
}) {
  const rows: { label: string; value: string; copy?: boolean }[] = [];
  if (instructions.alias) {
    rows.push({ label: "Alias", value: instructions.alias, copy: true });
  }
  if (instructions.cbu) {
    rows.push({ label: "CBU", value: instructions.cbu, copy: true });
  }
  if (instructions.holder) {
    rows.push({ label: "Titular", value: instructions.holder });
  }
  if (instructions.bank) {
    rows.push({ label: "Banco", value: instructions.bank });
  }

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      {isTestTransferData(instructions) ? (
        <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
          Datos de prueba
        </span>
      ) : null}
    <ul className="space-y-2">
      {rows.map((row) => (
        <li
          key={row.label}
          className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-cream/60 px-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="text-xs text-shadow/60">{row.label}</p>
            <p className="font-mono text-sm font-semibold text-shadow truncate">
              {row.value}
            </p>
          </div>
          {row.copy ? (
            <button
              type="button"
              onClick={() => copyText(row.value, row.label)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-shadow/70 hover:bg-stone-100"
              aria-label={`Copiar ${row.label}`}
            >
              <Copy className="h-4 w-4" />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
    </div>
  );
}

function WhatsAppFallback() {
  return (
    <p className="text-sm text-shadow/80">
      Luz te confirma alias y CBU por WhatsApp.{" "}
      <a
        href={shippingWhatsappUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-semibold text-palm underline-offset-2 hover:underline"
      >
        <MessageCircle className="h-4 w-4" />
        Escribir por WhatsApp
      </a>
    </p>
  );
}

export function PaymentMethodSelector({
  amount,
  isPickup,
  existingOrderId,
  onOfflineSuccess,
}: PaymentMethodSelectorProps) {
  const { setValue, watch, getValues } = useFormContext<CheckoutFormData>();
  const { items } = useCartStore();
  const paymentMethod = watch("paymentMethod");

  const [transferInfo, setTransferInfo] = useState<TransferInstructions | null>(
    null,
  );
  const [transferInfoLoaded, setTransferInfoLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [transferResult, setTransferResult] =
    useState<OfflineCheckoutResult | null>(null);

  useEffect(() => {
    if (paymentMethod !== "cash" || isPickup) return;
    setValue("paymentMethod", "mercadopago");
  }, [isPickup, paymentMethod, setValue]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/payments/transfer-info`);
        if (!res.ok) throw new Error("transfer-info");
        const json = (await res.json()) as ApiEnvelope<{
          transferInstructions: TransferInstructions | null;
          test?: boolean;
        }>;
        const instructions = json.data?.transferInstructions ?? null;
        const isTest =
          json.data?.test === true ||
          (instructions != null && isTestTransferData(instructions));
        if (!cancelled) {
          setTransferInfo(isTest ? null : instructions);
        }
      } catch {
        if (!cancelled) setTransferInfo(null);
      } finally {
        if (!cancelled) setTransferInfoLoaded(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!transferInfoLoaded) return;
    if (paymentMethod !== "transfer") return;
    if (!transferInfo) setValue("paymentMethod", "mercadopago");
  }, [paymentMethod, transferInfo, transferInfoLoaded, setValue]);

  const submitOffline = async (provider: "TRANSFER" | "CASH") => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/payments/offline-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildPublicCheckoutPayload(
            getValues(),
            items.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
            })),
          ),
          paymentProvider: provider,
          existingOrderId: existingOrderId || undefined,
        }),
      });
      const json = (await res.json()) as ApiEnvelope<OfflineCheckoutResult> & {
        message?: string;
      };
      if (!res.ok) {
        const message =
          typeof json.message === "string"
            ? json.message
            : "No se pudo registrar el pedido. Intentá de nuevo.";
        toast.error("No pudimos confirmar el pedido", { description: message });
        return;
      }
      const data = json.data;
      if (!data?.orderId) {
        toast.error("No pudimos confirmar el pedido");
        return;
      }
      if (provider === "TRANSFER") {
        setTransferResult(data);
        return;
      }
      onOfflineSuccess({ orderId: data.orderId, method: "cash" });
    } catch {
      toast.error("No pudimos confirmar el pedido", {
        description: "Revisá tu conexión e intentá de nuevo.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const transferEnabled = Boolean(transferInfo);
  const methods = [
    {
      id: "mercadopago" as const,
      label: "Mercado Pago",
      copy: "Pago instantáneo con tarjeta, débito o dinero en cuenta.",
      icon: Wallet,
    },
    ...(transferEnabled
      ? [
          {
            id: "transfer" as const,
            label: "Transferencia",
            copy: "Te mostramos alias y CBU para transferir.",
            icon: Building2,
          },
        ]
      : []),
    ...(isPickup
      ? [
          {
            id: "cash" as const,
            label: "Efectivo en el local",
            copy: `Pagás al retirar en ${brand.locationLabel}.`,
            icon: Banknote,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-shadow mb-1">
          Elegí cómo pagar
        </h3>
        <p className="text-sm text-shadow/70">
          {transferEnabled
            ? "Mercado Pago es inmediato. Transferencia y efectivo los confirma Luz."
            : isPickup
              ? "Mercado Pago es inmediato. El efectivo lo confirma Luz al retirar."
              : "Mercado Pago es inmediato."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {methods.map((method) => {
          const selected = paymentMethod === method.id;
          const Icon = method.icon;
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => setValue("paymentMethod", method.id)}
              className={`text-left p-4 border-2 rounded-xl transition-all ${
                selected
                  ? "border-palm bg-cream"
                  : "border-stone-200 hover:border-palm/40 bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2.5 rounded-lg ${
                    selected ? "bg-palm/15" : "bg-stone-100"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      selected ? "text-palm" : "text-shadow/50"
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-shadow">{method.label}</p>
                  <p className="text-sm text-shadow/70 mt-1">{method.copy}</p>
                </div>
                {selected ? (
                  <Check className="h-5 w-5 text-palm shrink-0 ml-auto" />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {paymentMethod === "transfer" && (
        <div className="space-y-4 border border-stone-200 rounded-xl p-4 bg-cream/40">
          <p className="text-sm font-medium text-shadow">
            Total a transferir: {formatArs(amount)}
          </p>
          {transferInfoLoaded && transferInfo ? (
            <TransferFields instructions={transferInfo} />
          ) : transferInfoLoaded ? (
            <WhatsAppFallback />
          ) : (
            <p className="text-sm text-shadow/60">Cargando datos…</p>
          )}
          <button
            type="button"
            onClick={() => void submitOffline("TRANSFER")}
            disabled={submitting}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 px-6 py-3 bg-terra text-shadow rounded-full font-semibold hover:bg-terra/90 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Confirmando…
              </>
            ) : (
              "Confirmar pedido y ver datos"
            )}
          </button>
        </div>
      )}

      {paymentMethod === "cash" && isPickup && (
        <div className="space-y-4 border border-stone-200 rounded-xl p-4 bg-cream/40">
          <div className="flex items-start gap-3">
            <Store className="h-5 w-5 text-palm mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-shadow">
                Pagás en efectivo al retirar
              </p>
              <p className="text-sm text-shadow/70 mt-1">
                {brand.locationLabel}
              </p>
              <p className="text-sm text-shadow/70 mt-1">
                Total: {formatArs(amount)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void submitOffline("CASH")}
            disabled={submitting}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 px-6 py-3 bg-terra text-shadow rounded-full font-semibold hover:bg-terra/90 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Confirmando…
              </>
            ) : (
              "Confirmar pedido para retirar"
            )}
          </button>
        </div>
      )}

      {transferResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-shadow/50" />
          <div className="relative w-full max-w-md rounded-2xl bg-cream p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold text-shadow">
              Transferí el importe
            </h3>
            <p className="text-sm text-shadow/80">
              Monto:{" "}
              <span className="font-semibold">
                {formatArs(Number(transferResult.total))}
              </span>
            </p>
            {transferResult.transferInstructions ? (
              <TransferFields
                instructions={transferResult.transferInstructions}
              />
            ) : (
              <WhatsAppFallback />
            )}
            <button
              type="button"
              onClick={() =>
                onOfflineSuccess({
                  orderId: transferResult.orderId,
                  method: "transfer",
                })
              }
              className="inline-flex min-h-11 w-full items-center justify-center px-6 py-3 bg-terra text-shadow rounded-full font-semibold hover:bg-terra/90"
            >
              Ya transferí
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
