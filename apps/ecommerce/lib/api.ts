// 📁 apps/ecommerce/lib/api.ts
// API Client - Agents-Ready: Estructura clara y predecible

import { Product, Category } from "@repo/types";

// Human-Core: URL con fallback claro
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function hasConnectionRefused(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const typed = error as {
    code?: string;
    cause?: { code?: string; errors?: Array<{ code?: string }> };
  };

  if (typed.code === "ECONNREFUSED") return true;
  if (typed.cause?.code === "ECONNREFUSED") return true;
  return Boolean(
    typed.cause?.errors?.some((item) => item.code === "ECONNREFUSED"),
  );
}

// Systems-Oriented: Manejo de errores graceful
async function safeFetch<T>(
  url: string,
  options?: RequestInit,
  fallbackData?: T,
  /** Si es true, el fallback se usa SOLO cuando el API responde 404. Un
   *  timeout o una caida se propagan. Sin esto, con el API abajo todas las
   *  paginas de producto responderian 404 y Google las desindexa. */
  fallbackOnlyOn404 = false,
): Promise<T> {
  try {
    const res = await fetch(url, {
      ...options,
      // Agents-Ready: Timeout para no bloquear indefinidamente
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      // Comparar contra undefined y no por truthiness: null y 0 son fallbacks
      // legitimos. Con `if (fallbackData)` el null de getProduct se trataba
      // como "sin fallback", se lanzaba el error y el notFound() de la pagina
      // de producto quedaba inalcanzable.
      const aplicaFallback =
        fallbackData !== undefined && (!fallbackOnlyOn404 || res.status === 404);

      if (aplicaFallback) return fallbackData;
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    return res.json();
  } catch (error) {
    // Un timeout o un ECONNREFUSED no son "no existe": si el fallback era solo
    // para el 404, propagamos para que la pagina muestre el error real.
    if (fallbackData !== undefined && !fallbackOnlyOn404) {
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
  throwOnError = false,
}: {
  category?: string;
  search?: string;
  sortBy?: string;
  order?: "asc" | "desc";
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  /** Si true, propaga el error en vez de devolver []. Lo usa /productos para
   *  distinguir "API caída" de "catálogo vacío" y mostrar ApiErrorState. */
  throwOnError?: boolean;
} = {}): Promise<Product[]> {
  const params = new URLSearchParams();

  if (category) params.append("category", category);
  if (search) params.append("search", search);
  if (sortBy) params.append("sortBy", sortBy);
  if (order) params.append("order", order);
  if (minPrice) params.append("minPrice", minPrice.toString());
  if (maxPrice) params.append("maxPrice", maxPrice.toString());
  if (inStock) params.append("inStock", "true");

  return safeFetch<Product[]>(
    `${API_URL}/catalog?${params.toString()}`,
    {
      next: {
        // Cache largo (1h): el API dispara revalidación on-demand del tag
        // "products" al mutar catálogo/stock (POST /api/revalidate).
        revalidate: 3600,
        tags: ["products"],
      },
    },
    throwOnError ? undefined : [], // Fallback: array vacío si la API falla
  );
}

export async function getCategories(throwOnError = false): Promise<Category[]> {
  return safeFetch<Category[]>(
    `${API_URL}/categories`,
    {
      next: { revalidate: 300 }, // Cache 5 minutos
    },
    throwOnError ? undefined : [], // Fallback
  );
}

export async function getProduct(id: string): Promise<Product | null> {
  return safeFetch(
    `${API_URL}/catalog/${id}`,
    {
      // Mismo tag "products" para que la revalidación on-demand también refresque
      // las páginas de detalle al editar un producto.
      next: { revalidate: 3600, tags: ["products"] },
    },
    null, // Fallback: null -> notFound() en la pagina de producto
    true, // ...pero solo si el API dice 404, no si esta caido
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
