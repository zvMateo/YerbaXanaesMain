"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { Toaster } from "sonner";
import { CartDrawer } from "./cart-drawer";

// Nota: initMercadoPago se movió a app/checkout/layout.tsx para que el SDK
// (~80KB) cargue solo en el flujo de pago y no en todo el sitio.

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutos
            gcTime: 1000 * 60 * 30, // 30 minutos
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <CartDrawer />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#fff",
            border: "1px solid #e5e7eb",
          },
        }}
      />
    </QueryClientProvider>
  );
}
