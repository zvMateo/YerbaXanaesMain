"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { orderKeys } from "./use-orders";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/+$/, "");

export type PaymentLinkResult = {
  initPoint: string;
  sandboxInitPoint: string | null;
  preferenceId: string;
  amount: number;
  title: string;
};

export type CreatePaymentLinkInput = {
  orderId?: string;
  amount?: number;
  title?: string;
  payerEmail?: string;
};

async function createPaymentLink(
  body: CreatePaymentLinkInput,
): Promise<PaymentLinkResult> {
  const response = await fetchWithAuth(`${API_URL}/payments/payment-link`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const raw = (err as { message?: string | string[] }).message;
    throw new Error(
      (Array.isArray(raw) ? raw.join(", ") : raw) ||
        "No se pudo generar el link de Mercado Pago",
    );
  }
  const json = await response.json();
  return json.data as PaymentLinkResult;
}

export function useCreatePaymentLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPaymentLink,
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      if (vars.orderId) {
        queryClient.invalidateQueries({
          queryKey: orderKeys.detail(vars.orderId),
        });
      }
      toast.success("Link de Mercado Pago generado");
    },
    onError: (error: Error) => {
      toast.error("No se pudo generar el link", {
        description: error.message,
      });
    },
  });
}

export async function copyPaymentLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  } catch {
    toast.error("No se pudo copiar. Seleccioná el texto a mano.");
  }
}
