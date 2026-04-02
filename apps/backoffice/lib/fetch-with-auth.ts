import { authClient } from "@/lib/auth-client";

// Helper para hacer fetch autenticado
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  let sessionToken: string | undefined;

  try {
    // 1. Pedimos la sesión al servidor de Auth (Next.js)
    // El servidor sí puede leer la cookie HttpOnly y devolvernos el token en el body
    const { data } = await authClient.getSession();
    sessionToken = data?.session?.token;
  } catch (error) {
    console.error("Error obteniendo sesión:", error);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // 2. Si obtuvimos el token, lo enviamos como Bearer token (AuthGuard de NestJS lee Authorization: Bearer)
  if (sessionToken) {
    headers["Authorization"] = `Bearer ${sessionToken}`;
  }

  return fetch(url, {
    ...options,
    headers,
    // Importante: no necesitamos 'credentials: include' para llamar a la API externa
    // porque enviamos el token en el header explícitamente.
  });
}

// Hook para usar en cliente
export function useSessionToken() {
  return {
    getToken: async () => {
      const { data } = await authClient.getSession();
      return data?.session?.token || null;
    },
  };
}
