"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

// ============================================
// TIPOS
// ============================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  _count?: {
    products: number;
  };
}

export interface Ingredient {
  inventoryItemId: string;
  quantityRequired: number;
  inventoryItem?: {
    name: string;
    unit: string;
  };
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number; // Decimal in DB
  stock: number; // Virtual stock calculated by backend
  isVirtualStock?: boolean;
  ingredients?: Ingredient[];
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  isActive: boolean;
  images: string[];
  categoryId: string;
  category?: Category;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  name: string;
  description?: string;
  categoryId: string;
  isActive?: boolean;
  variants: {
    name: string;
    price: number;
    stock?: number;
    ingredients?: {
      inventoryItemId: string;
      quantityRequired: number;
    }[];
  }[];
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  categoryId?: string;
  isActive?: boolean;
}

// ============================================
// API FUNCTIONS
// ============================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function fetchProducts(): Promise<Product[]> {
  const response = await fetchWithAuth(`${API_URL}/catalog`);
  if (!response.ok) throw new Error("Error al cargar productos");
  return response.json();
}

async function fetchCategories(): Promise<Category[]> {
  const response = await fetchWithAuth(`${API_URL}/categories`);
  if (!response.ok) throw new Error("Error al cargar categorías");
  return response.json();
}

async function createProduct(data: CreateProductDto): Promise<Product> {
  const response = await fetchWithAuth(`${API_URL}/catalog`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Error al crear producto");
  return response.json();
}

async function updateProduct({
  id,
  data,
}: {
  id: string;
  data: UpdateProductDto;
}): Promise<Product> {
  const response = await fetchWithAuth(`${API_URL}/catalog/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Error al actualizar producto");
  return response.json();
}

async function deleteProduct(id: string): Promise<void> {
  const response = await fetchWithAuth(`${API_URL}/catalog/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Error al eliminar producto");
}

// ============================================
// REACT QUERY KEYS
// ============================================

export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  categories: () => ["categories"] as const,
};

// ============================================
// HOOKS
// ============================================

export function useProducts() {
  return useQuery({
    queryKey: productKeys.lists(),
    queryFn: fetchProducts,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: productKeys.categories(),
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10, // Categorías cambian poco
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      toast.success("Producto creado correctamente");
    },
    onError: (error) => {
      toast.error("Error al crear producto", {
        description:
          error instanceof Error ? error.message : "Error desconocido",
      });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      toast.success("Producto actualizado correctamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar producto", {
        description:
          error instanceof Error ? error.message : "Error desconocido",
      });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      toast.success("Producto eliminado");
    },
    onError: (error) => {
      toast.error("Error al eliminar", {
        description:
          error instanceof Error ? error.message : "Error desconocido",
      });
    },
  });
}
