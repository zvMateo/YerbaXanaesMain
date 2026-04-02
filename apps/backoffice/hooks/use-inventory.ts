"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

// ============================================
// TIPOS
// ============================================

export type MeasurementUnit = "GRAMS" | "UNITS";

export interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  currentStock: number;
  minStockAlert: number | null;
  unit: MeasurementUnit;
  costPrice: number | null; // Decimal in DB, number in JS
  updatedAt: string;
}

export interface CreateInventoryDto {
  name: string;
  sku?: string;
  currentStock: number;
  minStockAlert?: number;
  unit: MeasurementUnit;
  costPrice?: number;
}

export interface UpdateInventoryDto extends Partial<CreateInventoryDto> {}

// ============================================
// API FUNCTIONS
// ============================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function fetchInventory(): Promise<InventoryItem[]> {
  const response = await fetchWithAuth(`${API_URL}/inventory`);
  if (!response.ok) throw new Error("Error al cargar inventario");
  return response.json();
}

async function fetchInventoryItem(id: string): Promise<InventoryItem> {
  const response = await fetchWithAuth(`${API_URL}/inventory/${id}`);
  if (!response.ok) throw new Error("Item no encontrado");
  return response.json();
}

async function createInventoryItem(
  data: CreateInventoryDto,
): Promise<InventoryItem> {
  const response = await fetchWithAuth(`${API_URL}/inventory`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Error al crear item");
  return response.json();
}

async function updateInventoryItem({
  id,
  data,
}: {
  id: string;
  data: UpdateInventoryDto;
}): Promise<InventoryItem> {
  const response = await fetchWithAuth(`${API_URL}/inventory/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Error al actualizar item");
  return response.json();
}

async function adjustStock({
  id,
  quantityChange,
}: {
  id: string;
  quantityChange: number;
}): Promise<InventoryItem> {
  const response = await fetchWithAuth(`${API_URL}/inventory/${id}/adjust`, {
    method: "POST",
    body: JSON.stringify({ quantityChange }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Error al ajustar stock");
  }
  return response.json();
}

// ============================================
// REACT QUERY KEYS
// ============================================

export const inventoryKeys = {
  all: ["inventory"] as const,
  lists: () => [...inventoryKeys.all, "list"] as const,
  details: () => [...inventoryKeys.all, "detail"] as const,
  detail: (id: string) => [...inventoryKeys.details(), id] as const,
};

// ============================================
// HOOKS
// ============================================

export function useInventory() {
  return useQuery({
    queryKey: inventoryKeys.lists(),
    queryFn: fetchInventory,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useInventoryItem(id: string) {
  return useQuery({
    queryKey: inventoryKeys.detail(id),
    queryFn: () => fetchInventoryItem(id),
    enabled: !!id,
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      toast.success("Item creado correctamente");
    },
    onError: (error) => {
      toast.error("Error al crear item", {
        description:
          error instanceof Error ? error.message : "Error desconocido",
      });
    },
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adjustStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      toast.success("Stock ajustado correctamente");
    },
    onError: (error) => {
      toast.error("Error al ajustar stock", {
        description:
          error instanceof Error ? error.message : "Error desconocido",
      });
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateInventoryItem,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.detail(variables.id),
      });
      toast.success("Item actualizado correctamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar item", {
        description:
          error instanceof Error ? error.message : "Error desconocido",
      });
    },
  });
}
