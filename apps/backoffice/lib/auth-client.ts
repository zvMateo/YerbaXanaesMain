import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth";

function resolveAuthBaseUrl() {
  if (process.env.NODE_ENV === "development") {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }

    return "http://localhost:3002";
  }

  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";
}

export const authClient = createAuthClient({
  // En desarrollo siempre usamos el origen actual para evitar CORS por envs de producción.
  // En producción respetamos NEXT_PUBLIC_APP_URL.
  baseURL: resolveAuthBaseUrl(),
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const { useSession, signIn, signOut, signUp } = authClient;
