"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/+$/, "");

// ============================================================
// TIPOS
// ============================================================

export interface StoreSettings {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  shippingEnabled: boolean;
  shippingFlatRate: number;
  freeShippingThreshold: number;
  paymentMercadoPago: boolean;
  paymentCash: boolean;
  paymentTransfer: boolean;
  notificationEmail: string;
  lowStockAlert: boolean;
  lowStockThreshold: number;
  updatedAt: string;
}

export type UpdateSettingsDto = Partial<Omit<StoreSettings, "id" | "updatedAt">>;

// ============================================================
// QUERY KEYS
// ============================================================

export const settingsKeys = {
  all: ["settings"] as const,
  detail: () => [...settingsKeys.all, "detail"] as const,
};

// ============================================================
// FETCH HELPERS
// ============================================================

async function fetchSettings(): Promise<StoreSettings> {
  const res = await fetchWithAuth(`${API_URL}/settings`);
  if (!res.ok) throw new Error("Error al cargar la configuración");
  return res.json();
}

async function updateSettings(dto: UpdateSettingsDto): Promise<StoreSettings> {
  const res = await fetchWithAuth(`${API_URL}/settings`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || "Error al guardar");
  }
  return res.json();
}

// ============================================================
// HOOKS
// ============================================================

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.detail(),
    queryFn: fetchSettings,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.detail() });
      toast.success("Configuración guardada", {
        description: "Los cambios se aplicaron correctamente",
      });
    },
    onError: (error) => {
      toast.error("Error al guardar", {
        description:
          error instanceof Error ? error.message : "Error desconocido",
      });
    },
  });
}
