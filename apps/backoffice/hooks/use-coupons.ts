"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/+$/, "");

export interface Coupon {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderAmount?: number;
  maxUses?: number;
  currentUses: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  _count?: { discounts: number };
}

export interface CreateCouponDto {
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderAmount?: number;
  maxUses?: number;
  expiresAt?: string;
}

async function fetchCoupons(): Promise<Coupon[]> {
  const response = await fetchWithAuth(`${API_URL}/coupons`);
  if (!response.ok) throw new Error("Error al cargar cupones");
  return response.json();
}

async function createCoupon(data: CreateCouponDto): Promise<Coupon> {
  const response = await fetchWithAuth(`${API_URL}/coupons`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any).message || "Error al crear cupón");
  }
  return response.json();
}

async function toggleCoupon(id: string): Promise<Coupon> {
  const response = await fetchWithAuth(`${API_URL}/coupons/${id}/toggle`, {
    method: "PATCH",
  });
  if (!response.ok) throw new Error("Error al actualizar cupón");
  return response.json();
}

async function deleteCoupon(id: string): Promise<void> {
  const response = await fetchWithAuth(`${API_URL}/coupons/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Error al eliminar cupón");
}

export const couponKeys = {
  all: ["coupons"] as const,
  lists: () => [...couponKeys.all, "list"] as const,
};

export function useCoupons() {
  return useQuery({
    queryKey: couponKeys.lists(),
    queryFn: fetchCoupons,
    staleTime: 1000 * 60,
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponKeys.lists() });
      toast.success("Cupón creado");
    },
    onError: (error) => {
      toast.error("Error al crear cupón", {
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    },
  });
}

export function useToggleCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponKeys.lists() });
    },
    onError: (error) => {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    },
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponKeys.lists() });
      toast.success("Cupón eliminado");
    },
    onError: (error) => {
      toast.error("Error al eliminar", {
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    },
  });
}
