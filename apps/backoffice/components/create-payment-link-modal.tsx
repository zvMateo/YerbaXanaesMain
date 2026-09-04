"use client";

import { useState } from "react";
import { Copy, Link2, Loader2, X } from "lucide-react";
import {
  copyPaymentLink,
  useCreatePaymentLink,
  type PaymentLinkResult,
} from "@/hooks/use-mp-payment-link";

export function CreatePaymentLinkModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const create = useCreatePaymentLink();
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [result, setResult] = useState<PaymentLinkResult | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setAmount("");
    setTitle("");
    setPayerEmail("");
    setResult(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed < 1) return;
    try {
      const data = await create.mutateAsync({
        amount: parsed,
        title: title.trim() || undefined,
        payerEmail: payerEmail.trim() || undefined,
      });
      setResult(data);
    } catch {
      // toast ya lo muestra el hook
    }
  };

  const link = result?.initPoint || result?.sandboxInitPoint || "";

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-stone-900">Link de pago</h3>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {result && link ? (
          <div className="space-y-4">
            <p className="text-sm text-stone-600">
              {result.title} ·{" "}
              {result.amount.toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
              })}
            </p>
            <p className="break-all rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 font-mono text-xs text-stone-800">
              {link}
            </p>
            <button
              type="button"
              onClick={() => void copyPaymentLink(link)}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-yerba-600 px-4 text-sm font-medium text-white hover:bg-yerba-700"
            >
              <Copy className="h-4 w-4" />
              Copiar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Monto (ARS)
              </label>
              <input
                autoFocus
                type="number"
                min="1"
                step="0.01"
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ej: 15000"
                className="w-full min-h-11 rounded-xl border border-stone-200 px-4 py-2.5 text-base outline-none focus:ring-2 focus:ring-yerba-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Concepto
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Pago YerbaXanaes"
                className="w-full min-h-11 rounded-xl border border-stone-200 px-4 py-2.5 text-base outline-none focus:ring-2 focus:ring-yerba-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Email del pagador (opcional)
              </label>
              <input
                type="email"
                value={payerEmail}
                onChange={(e) => setPayerEmail(e.target.value)}
                placeholder="cliente@correo.com"
                className="w-full min-h-11 rounded-xl border border-stone-200 px-4 py-2.5 text-base outline-none focus:ring-2 focus:ring-yerba-500"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-4 text-sm font-medium text-stone-600 hover:bg-stone-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={create.isPending}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-yerba-600 px-4 text-sm font-medium text-white hover:bg-yerba-700 disabled:opacity-50"
              >
                {create.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generando…
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4" />
                    Generar link
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
