// 📁 apps/ecommerce/lib/api.ts
// API Client - Agents-Ready: Estructura clara y predecible

import { Product, Category } from "@repo/types";

// Human-Core: URL con fallback claro
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Systems-Oriented: Manejo de errores graceful
async function safeFetch<T>(
  url: string,
  options?: RequestInit,
  fallbackData?: T,
): Promise<T> {
  try {
    const res = await fetch(url, {
      ...options,
      // Agents-Ready: Timeout para no bloquear indefinidamente
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.error(`API Error: ${res.status} - ${res.statusText}`);
      if (fallbackData) return fallbackData;
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    return res.json();
  } catch (error) {
    // Human-Core: Error message claro para debugging
    console.error(`Fetch failed for ${url}:`, error);

    if (fallbackData) {
      console.warn(`Returning fallback data for ${url}`);
      return fallbackData;
    }

    throw error;
  }
}

// Generative UI: Función adaptativa que filtra según contexto
export async function getProducts({
  category,
  search,
  sortBy = "createdAt",
  order = "desc",
  minPrice,
  maxPrice,
  inStock,
}: {
  category?: string;
  search?: string;
  sortBy?: string;
  order?: "asc" | "desc";
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
} = {}): Promise<Product[]> {
  const params = new URLSearchParams();

  if (category) params.append("category", category);
  if (search) params.append("search", search);
  if (sortBy) params.append("sortBy", sortBy);
  if (order) params.append("order", order);
  if (minPrice) params.append("minPrice", minPrice.toString());
  if (maxPrice) params.append("maxPrice", maxPrice.toString());
  if (inStock) params.append("inStock", "true");

  return safeFetch(
    `${API_URL}/catalog?${params.toString()}`,
    {
      next: {
        revalidate: 60, // Cache 1 minuto - Systems-Oriented: Datos frescos
        tags: ["products"],
      },
    },
    [], // Fallback: array vacío si la API falla
  );
}

export async function getCategories(): Promise<Category[]> {
  return safeFetch(
    `${API_URL}/categories`,
    {
      next: { revalidate: 300 }, // Cache 5 minutos
    },
    [], // Fallback
  );
}

export async function getProduct(id: string): Promise<Product | null> {
  return safeFetch(
    `${API_URL}/catalog/${id}`,
    {
      next: { revalidate: 60 },
    },
    null, // Fallback
  );
}

export interface RatingResult {
  ratings: {
    id: string;
    rating: number;
    comment?: string;
    createdAt: string;
    user?: { name?: string; email: string };
  }[];
  avgRating: number;
  totalRatings: number;
}

export async function getProductRatings(
  productId: string,
): Promise<RatingResult> {
  return safeFetch(
    `${API_URL}/products/${productId}/ratings`,
    { next: { revalidate: 60, tags: [`ratings-${productId}`] } },
    { ratings: [], avgRating: 0, totalRatings: 0 },
  );
}

// Health check - Systems-Oriented: Verificar conectividad
export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/catalog`, {
      method: "HEAD",
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
