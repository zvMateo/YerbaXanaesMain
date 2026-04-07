"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/+$/, "");

export interface Rating {
  id: string;
  productId: string;
  userId?: string;
  orderId?: string;
  rating: number;
  comment?: string;
  isApproved: boolean;
  createdAt: string;
  product?: { name: string; slug: string };
  user?: { name?: string; email: string };
}

async function fetchRatings(): Promise<Rating[]> {
  const response = await fetchWithAuth(`${API_URL}/ratings`);
  if (!response.ok) throw new Error("Error al cargar reseñas");
  return response.json();
}

async function approveRating(id: string): Promise<Rating> {
  const response = await fetchWithAuth(`${API_URL}/ratings/${id}/approve`, {
    method: "PATCH",
  });
  if (!response.ok) throw new Error("Error al aprobar reseña");
  return response.json();
}

async function rejectRating(id: string): Promise<Rating> {
  const response = await fetchWithAuth(`${API_URL}/ratings/${id}/reject`, {
    method: "PATCH",
  });
  if (!response.ok) throw new Error("Error al rechazar reseña");
  return response.json();
}

async function deleteRating(id: string): Promise<void> {
  const response = await fetchWithAuth(`${API_URL}/ratings/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Error al eliminar reseña");
}

export const ratingKeys = {
  all: ["ratings"] as const,
  lists: () => [...ratingKeys.all, "list"] as const,
};

export function useRatings() {
  return useQuery({
    queryKey: ratingKeys.lists(),
    queryFn: fetchRatings,
    staleTime: 1000 * 60,
  });
}

export function useApproveRating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveRating,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ratingKeys.lists() });
      toast.success("Reseña aprobada");
    },
    onError: (error) => {
      toast.error("Error", { description: error instanceof Error ? error.message : "Error" });
    },
  });
}

export function useRejectRating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectRating,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ratingKeys.lists() });
      toast.success("Reseña rechazada");
    },
    onError: (error) => {
      toast.error("Error", { description: error instanceof Error ? error.message : "Error" });
    },
  });
}

export function useDeleteRating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRating,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ratingKeys.lists() });
      toast.success("Reseña eliminada");
    },
    onError: (error) => {
      toast.error("Error al eliminar", { description: error instanceof Error ? error.message : "Error" });
    },
  });
}
