"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/+$/, "");

// ============================================
// TIPOS
// ============================================

export type CustomerSegment = "vip" | "regular" | "new" | "at-risk";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders: number;
  totalSpent: number;
  lastOrder: string | null;
  segment: CustomerSegment;
  createdAt: string;
}

export interface CustomerDetails extends Customer {
  address?: {
    street: string;
    city: string;
    province: string;
    zipCode: string;
  };
  orderHistory: Array<{
    id: string;
    date: string;
    total: number;
    status: string;
    items: number;
  }>;
}

// ============================================
// API FUNCTIONS
// ============================================

async function fetchCustomers(): Promise<Customer[]> {
  const response = await fetchWithAuth(`${API_URL}/customers`);
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("No autorizado. Iniciá sesión nuevamente.");
    }
    throw new Error("Error al cargar clientes");
  }
  return response.json();
}

async function fetchCustomerById(id: string): Promise<CustomerDetails> {
  const response = await fetchWithAuth(`${API_URL}/customers/${id}`);
  if (!response.ok) throw new Error("Cliente no encontrado");
  return response.json();
}

async function fetchCustomerStats(): Promise<{
  totalCustomers: number;
  totalRevenue: number;
  segmentCounts: Record<CustomerSegment, number>;
  vipCustomers: number;
  newCustomers: number;
  atRiskCustomers: number;
  topCustomers: Array<{
    id: string;
    name: string;
    orders: number;
    totalSpent: number;
  }>;
  averageCustomerValue: number;
}> {
  const response = await fetchWithAuth(`${API_URL}/customers/stats`);
  if (!response.ok) throw new Error("Error al cargar estadísticas");
  return response.json();
}

// ============================================
// REACT QUERY KEYS
// ============================================

export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (filters: { segment?: string; search?: string }) =>
    [...customerKeys.lists(), { filters }] as const,
  details: () => [...customerKeys.all, "detail"] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  stats: () => [...customerKeys.all, "stats"] as const,
};

// ============================================
// HOOKS
// ============================================

export function useCustomers() {
  return useQuery({
    queryKey: customerKeys.lists(),
    queryFn: fetchCustomers,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => fetchCustomerById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCustomerStats() {
  return useQuery({
    queryKey: customerKeys.stats(),
    queryFn: fetchCustomerStats,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSearchCustomers(searchTerm: string) {
  const { data: customers, isLoading } = useCustomers();

  const filteredCustomers = useMemo(() => {
    if (!customers || !searchTerm) return customers || [];

    const term = searchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        c.phone.includes(term),
    );
  }, [customers, searchTerm]);

  return { customers: filteredCustomers, isLoading };
}
