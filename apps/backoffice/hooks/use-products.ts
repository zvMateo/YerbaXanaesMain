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
  _count?: {
    orderItems: number;
  };
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  isActive: boolean;
  isFeatured: boolean;
  images: string[];
  categoryId: string;
  category?: Category;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface VariantDto {
  name: string;
  price: number;
  stock?: number;
  sku?: string;
  costPrice?: number;
  weight?: number;
  ingredients?: {
    inventoryItemId: string;
    quantityRequired: number;
  }[];
}

export interface CreateProductDto {
  name: string;
  description?: string;
  categoryId: string;
  isActive?: boolean;
  isFeatured?: boolean;
  variants: VariantDto[];
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  categoryId?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  variants?: VariantDto[];
}

// ============================================
// API FUNCTIONS
// ============================================

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/+$/, "");

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

async function toggleProductStatus({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}): Promise<Product> {
  const response = await fetchWithAuth(`${API_URL}/catalog/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
  if (!response.ok) throw new Error("Error al cambiar el estado del producto");
  return response.json();
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

export function useToggleProductStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleProductStatus,
    onSuccess: (updatedProduct) => {
      // Optimistic cache update
      queryClient.setQueryData(
        productKeys.lists(),
        (old: Product[] | undefined) => {
          if (!old) return old;
          return old.map((p) =>
            p.id === updatedProduct.id ? updatedProduct : p,
          );
        },
      );
      toast.success(
        updatedProduct.isActive ? "Producto activado" : "Producto desactivado",
      );
    },
    onError: (error) => {
      toast.error("Error al cambiar estado", {
        description:
          error instanceof Error ? error.message : "Error desconocido",
      });
    },
  });
}

async function uploadProductImage({
  productId,
  file,
}: {
  productId: string;
  file: File;
}): Promise<Product> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetchWithAuth(
    `${API_URL}/catalog/${productId}/images`,
    {
      method: "POST",
      body: formData,
    },
  );
  if (!response.ok) throw new Error("Error al subir imagen");
  return response.json();
}

async function removeProductImage({
  productId,
  url,
}: {
  productId: string;
  url: string;
}): Promise<Product> {
  const response = await fetchWithAuth(
    `${API_URL}/catalog/${productId}/images`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    },
  );
  if (!response.ok) throw new Error("Error al eliminar imagen");
  return response.json();
}

export function useUploadProductImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadProductImage,
    onSuccess: (data) => {
      // Update cache
      queryClient.setQueryData(
        productKeys.lists(),
        (old: Product[] | undefined) => {
          if (!old) return old;
          return old.map((p) => (p.id === data.id ? data : p));
        },
      );
    },
  });
}

export function useRemoveProductImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeProductImage,
    onSuccess: (data) => {
      queryClient.setQueryData(
        productKeys.lists(),
        (old: Product[] | undefined) => {
          if (!old) return old;
          return old.map((p) => (p.id === data.id ? data : p));
        },
      );
    },
  });
}

// ============================================
// CATEGORY MUTATIONS
// ============================================

async function createCategory(data: {
  name: string;
  slug?: string;
}): Promise<Category> {
  const response = await fetchWithAuth(`${API_URL}/categories`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Error al crear categoría");
  return response.json();
}

async function updateCategory({
  id,
  data,
}: {
  id: string;
  data: { name: string; slug?: string };
}): Promise<Category> {
  const response = await fetchWithAuth(`${API_URL}/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Error al actualizar categoría");
  return response.json();
}

async function deleteCategory(id: string): Promise<void> {
  const response = await fetchWithAuth(`${API_URL}/categories/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message || "Error al eliminar categoría",
    );
  }
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.categories() });
      toast.success("Categoría creada correctamente");
    },
    onError: (error) => {
      toast.error("Error al crear categoría", {
        description:
          error instanceof Error ? error.message : "Error desconocido",
      });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.categories() });
      toast.success("Categoría actualizada correctamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar categoría", {
        description:
          error instanceof Error ? error.message : "Error desconocido",
      });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.categories() });
      toast.success("Categoría eliminada");
    },
    onError: (error) => {
      toast.error("Error al eliminar", {
        description:
          error instanceof Error ? error.message : "Error desconocido",
      });
    },
  });
}
