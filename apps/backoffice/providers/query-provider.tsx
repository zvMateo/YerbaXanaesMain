"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

/**
 * Configuración optimizada de TanStack Query
 *
 * Estrategias implementadas:
 * - Stale Time: 5 minutos para datos que no cambian frecuentemente
 * - Cache Time: 10 minutos para mantener datos en memoria
 * - Retry: Máximo 3 intentos con backoff exponencial
 * - Refetch: Solo en window focus para evitar requests innecesarios
 */

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Datos considerados "frescos" por 5 minutos
        staleTime: 1000 * 60 * 5,

        // Mantener en cache por 10 minutos después de stale
        gcTime: 1000 * 60 * 10,

        // Reintentar 3 veces máximo
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // No refetch automático al reconectar (ahorro de bandwidth)
        refetchOnReconnect: false,

        // Refetch al volver a la pestaña solo si los datos están stale
        refetchOnWindowFocus: true,

        // Mantener datos anteriores mientras se cargan nuevos (UX suave)
        placeholderData: (previousData: unknown) => previousData,
      },
      mutations: {
        // Reintentar mutations solo en errores de red
        retry: (failureCount, error: Error) => {
          if (error.message.includes("network")) return failureCount < 2;
          return false;
        },
      },
    },
  });
}

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Crear una única instancia de QueryClient por sesión
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
