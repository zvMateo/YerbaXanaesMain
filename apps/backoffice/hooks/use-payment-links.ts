"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/+$/, "");

// Tipos
export interface PaymentLink {
  id: string;
  title: string;
  description?: string;
  unitPrice: number;
  quantity: number;
  currencyId: string;
  initPoint: string;
  status: "ACTIVE" | "INACTIVE" | "EXPIRED";
  expirationDate?: string;
  createdAt: string;
  totalClicks?: number;
  totalPayments?: number;
}

export interface CreatePaymentLinkDto {
  title: string;
  description?: string;
  unit_price: number;
  quantity: number;
  currency_id?: string;
  expiration_date?: string;
}

// Funciones API
async function fetchPaymentLinks(): Promise<PaymentLink[]> {
  const response = await fetchWithAuth(`${API_URL}/payment-links`);
  if (!response.ok) throw new Error("Error al cargar links de pago");
  const json = await response.json();
  return json.data; // El controlador devuelve { success: true, data: [...] }
}

async function createPaymentLink(
  data: CreatePaymentLinkDto,
): Promise<PaymentLink> {
  const response = await fetchWithAuth(`${API_URL}/payment-links`, {
    method: "POST",
    body: JSON.stringify({
      ...data,
      currency_id: data.currency_id || "ARS",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al crear link");
  }

  const json = await response.json();
  return json.data;
}

async function deactivatePaymentLink(id: string): Promise<void> {
  const response = await fetchWithAuth(`${API_URL}/payment-links/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Error al desactivar link");
}

// Hooks
export const paymentLinkKeys = {
  all: ["payment-links"] as const,
  lists: () => [...paymentLinkKeys.all, "list"] as const,
};

export function usePaymentLinks() {
  return useQuery({
    queryKey: paymentLinkKeys.lists(),
    queryFn: fetchPaymentLinks,
  });
}

export function useCreatePaymentLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPaymentLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentLinkKeys.lists() });
      toast.success("Link de pago generado", {
        description: "Listo para compartir por WhatsApp",
      });
    },
    onError: (error) => {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "No se pudo crear el link",
      });
    },
  });
}

export function useDeactivatePaymentLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivatePaymentLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentLinkKeys.lists() });
      toast.success("Link desactivado");
    },
    onError: (error) => {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "No se pudo desactivar",
      });
    },
  });
}
