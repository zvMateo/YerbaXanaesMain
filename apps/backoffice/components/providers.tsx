"use client";

import { AuthProvider } from "@/hooks/use-auth";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "0.75rem",
            },
          }}
        />
      </AuthProvider>
    </QueryProvider>
  );
}
