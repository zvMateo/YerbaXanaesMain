// 📁 apps/ecommerce/hooks/use-products.ts
// Human-Core: Estados naturales y feedback vivo

import { useQuery } from "@tanstack/react-query";
import { Product } from "@repo/types";
import { getProducts, getCategories } from "@/lib/api";

interface UseProductsOptions {
  category?: string;
  search?: string;
  sortBy?: string;
  order?: "asc" | "desc";
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

// Generative UI: Hook adaptativo que responde a cambios de contexto
export function useProducts(options: UseProductsOptions = {}) {
  return useQuery({
    queryKey: ["products", options],
    queryFn: () => getProducts(options),
    staleTime: 1000 * 60, // 1 minuto - Systems-Oriented: Datos frescos pero cacheados
    placeholderData: (previousData) => previousData, // Generative: Mantiene UI mientras carga nueva data
  });
}

// Hook específico para categorías - Agents-Ready: Datos estructurados
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
