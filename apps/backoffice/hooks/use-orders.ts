"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMemo } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

// ============================================
// TIPOS
// ============================================

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "REJECTED"
  | "CANCELLED"
  | "REFUNDED";

export interface Order {
  id: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  total: number;
  status: OrderStatus;
  createdAt: string; // ISO string
  paymentProvider: string;
  items: Array<any>; // Idealmente definir el tipo OrderItem
  user?: {
    name?: string;
    email: string;
  };
  // Datos de envío
  deliveryType?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingZip?: string;
  shippingProvinceCode?: string;
  shippingCost?: number;
  shippingProvider?: string;
  trackingNumber?: string;
  correoShippingId?: string;
  correoImportedAt?: string;
}

export interface OrderDetails extends Order {
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    variant: {
      name: string;
      product: {
        name: string;
      };
    };
  }>;
  // Agrega más campos si la API los devuelve
}

// ============================================
// API FUNCTIONS
// ============================================

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/+$/, "");

async function fetchOrders(): Promise<Order[]> {
  const response = await fetchWithAuth(`${API_URL}/orders`);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("No autorizado");
    }
    throw new Error("Error al cargar órdenes");
  }
  return response.json();
}

async function fetchOrderById(id: string): Promise<OrderDetails> {
  const response = await fetchWithAuth(`${API_URL}/orders/${id}`);
  if (!response.ok) throw new Error("Orden no encontrada");
  return response.json();
}

async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  note?: string,
): Promise<Order> {
  const response = await fetchWithAuth(`${API_URL}/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, note }),
  });

  if (!response.ok) throw new Error("Error al actualizar orden");
  return response.json();
}

async function bulkUpdateOrderStatus(
  ids: string[],
  status: OrderStatus,
): Promise<void> {
  // Implementar endpoint de bulk update en backend si es necesario
  // Por ahora hacemos múltiples requests en paralelo
  await Promise.all(ids.map((id) => updateOrderStatus(id, status)));
}

// ============================================
// REACT QUERY KEYS
// ============================================

export const orderKeys = {
  all: ["orders"] as const,
  lists: () => [...orderKeys.all, "list"] as const,
  list: (filters: { status?: string; search?: string }) =>
    [...orderKeys.lists(), { filters }] as const,
  details: () => [...orderKeys.all, "detail"] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  stats: () => [...orderKeys.all, "stats"] as const,
};

// ============================================
// HOOKS
// ============================================

/**
 * Hook para obtener todas las órdenes
 * Cache: 2 minutos (las órdenes cambian frecuentemente)
 */
export function useOrders() {
  return useQuery({
    queryKey: orderKeys.lists(),
    queryFn: fetchOrders,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

/**
 * Hook para obtener una orden específica con detalles
 */
export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => fetchOrderById(id),
    enabled: !!id,
    staleTime: 1000 * 60, // 1 minuto
  });
}

/**
 * Hook para actualizar el estado de una orden
 * Optimistic Update: Actualiza el UI inmediatamente
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      note,
    }: {
      id: string;
      status: OrderStatus;
      note?: string;
    }) => updateOrderStatus(id, status, note),

    onMutate: async ({ id, status }) => {
      // Cancelar re-fetches
      await queryClient.cancelQueries({ queryKey: orderKeys.lists() });
      await queryClient.cancelQueries({ queryKey: orderKeys.detail(id) });

      // Guardar estado anterior
      const previousOrders = queryClient.getQueryData<Order[]>(
        orderKeys.lists(),
      );
      const previousOrder = queryClient.getQueryData<OrderDetails>(
        orderKeys.detail(id),
      );

      // Actualizar optimistamente la lista
      if (previousOrders) {
        queryClient.setQueryData(
          orderKeys.lists(),
          previousOrders.map((order) =>
            order.id === id ? { ...order, status } : order,
          ),
        );
      }

      // Actualizar optimistamente el detalle
      if (previousOrder) {
        queryClient.setQueryData(orderKeys.detail(id), {
          ...previousOrder,
          status,
        });
      }

      return { previousOrders, previousOrder };
    },

    onSuccess: (_, variables) => {
      toast.success("Estado actualizado", {
        description: `Orden marcada como ${variables.status}`,
      });
      // Invalidar para traer datos frescos del server
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },

    onError: (error, variables, context) => {
      // Revertir cambios
      if (context?.previousOrders) {
        queryClient.setQueryData(orderKeys.lists(), context.previousOrders);
      }
      if (context?.previousOrder) {
        queryClient.setQueryData(
          orderKeys.detail(variables.id),
          context.previousOrder,
        );
      }

      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Error al actualizar",
      });
    },
  });
}

/**
 * Hook para actualizar múltiples órdenes a la vez
 */
export function useBulkUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: OrderStatus }) =>
      bulkUpdateOrderStatus(ids, status),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      toast.success("Órdenes actualizadas", {
        description: `${variables.ids.length} órdenes marcadas como ${variables.status}`,
      });
    },

    onError: (error) => {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Error al actualizar",
      });
    },
  });
}

/**
 * Hook para estadísticas de órdenes
 * Calcula métricas derivadas de las órdenes
 */
export function useOrderStats() {
  const { data: orders, isLoading, error } = useOrders();

  const stats = useMemo(() => {
    if (!orders) return null;

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const pendingOrders = orders.filter((o) => o.status === "PENDING").length;
    const completedOrders = orders.filter((o) => o.status === "PAID").length;

    const statusCounts = orders.reduce(
      (acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      },
      {} as Record<OrderStatus, number>,
    );

    const today = new Date().toISOString().split("T")[0];
    // Ajustar lógica de fecha según formato de backend (ISO String completo)
    const todayOrders = orders.filter((o) => o.createdAt.startsWith(today));
    const todayRevenue = todayOrders.reduce(
      (sum, o) => sum + Number(o.total),
      0,
    );

    return {
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      statusCounts,
      todayOrders: todayOrders.length,
      todayRevenue,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    };
  }, [orders]);

  return { stats, isLoading, error };
}

// ============================================================
// HOOK: Importar envío a Correo Argentino
// ============================================================

async function importShippingToCorreo(
  orderId: string,
): Promise<{ trackingNumber: string }> {
  const response = await fetchWithAuth(
    `${API_URL}/shipping/import/${orderId}`,
    { method: "POST" },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message ||
        "Error al importar envío a Correo Argentino",
    );
  }
  return response.json();
}

export function useImportShipping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => importShippingToCorreo(orderId),
    onSuccess: (data, orderId) => {
      toast.success("Envío importado a Correo Argentino", {
        description: `Número de seguimiento: ${data.trackingNumber}`,
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", orderId] });
    },
    onError: (error: Error) => {
      toast.error("Error al importar envío", {
        description: error.message,
      });
    },
  });
}
