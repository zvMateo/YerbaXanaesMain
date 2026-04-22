import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { nextCookies } from "better-auth/next-js";

const prisma = new PrismaClient();

// Determinar si estamos en producción para activar seguridad extra
const isProduction = process.env.NODE_ENV === "production";
const authBaseUrl =
  process.env.BETTER_AUTH_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3002";
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  baseURL: authBaseUrl,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    // No requerimos verificación de email para el backoffice
    // (la clienta se registra con Google o con email ya verificado)
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {},
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "USER",
      },
    },
  },
  // Seguridad en producción
  advanced: {
    useSecureCookies: isProduction,
    // Background tasks para Vercel (envía emails sin bloquear la respuesta)
    backgroundTasks: {
      handler: (promise) => {
        // En Vercel, waitUntil asegura que los emails se envíen
        // antes de que el serverless function termine
        if (typeof globalThis !== "undefined" && "waitUntil" in globalThis) {
          (globalThis as any).waitUntil(promise);
        }
      },
    },
  },
  // Rate limiting desactivado por ahora para evitar errores de tablas faltantes.
  // Se puede reactivar en el futuro creando la migración correspondiente.
  rateLimit: {
    enabled: false,
  },
  plugins: [nextCookies()],
  // Orígenes confiables: producción + localhost para desarrollo
  trustedOrigins: [
    "https://admin.yerbaxanaes.com",
    "https://yerbaxanaes.com",
    "http://localhost:3002",
  ],
});
