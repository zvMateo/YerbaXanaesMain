import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  // Usamos NEXT_PUBLIC_APP_URL porque es la única variable expuesta al navegador en Vercel.
  // BETTER_AUTH_BASE_URL solo corre en el servidor (middleware, auth.ts).
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002",
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const { useSession, signIn, signOut, signUp } = authClient;
