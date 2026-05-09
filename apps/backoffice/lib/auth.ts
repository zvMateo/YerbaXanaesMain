import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
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

// Lista de emails autorizados para registrarse como ADMIN.
// Cualquier otro email que intente loguearse será rechazado.
// Configurar via env var ADMIN_EMAILS (separados por coma).
const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

if (adminEmails.length === 0 && isProduction) {
  // En producción, sin ADMIN_EMAILS configurado, todos los signups fallan.
  // Esto es intencional: previene accesos no autorizados.
  console.warn(
    "[auth] ADMIN_EMAILS no configurado — todos los registros nuevos serán rechazados.",
  );
}

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
  /**
   * SECURITY: Allowlist de emails para acceso al backoffice.
   *
   * Antes: cualquier usuario con cuenta Google podía registrarse y quedaba
   * persistido en la DB con rol USER. El AuthProvider del cliente lo deslogueaba,
   * pero el usuario seguía existiendo.
   *
   * Ahora: el hook before rechaza el create si el email no está en ADMIN_EMAILS,
   * y asigna rol ADMIN automáticamente a los emails autorizados.
   *
   * Para invitar nuevos admins (Phase 2): agregarlos a ADMIN_EMAILS o
   * implementar un sistema de invitaciones que pre-cargue Invitations.
   */
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const userEmail = user.email?.toLowerCase().trim();

          if (!userEmail) {
            throw new APIError("BAD_REQUEST", {
              message: "Email requerido para registrarse.",
            });
          }

          if (adminEmails.length === 0) {
            throw new APIError("BAD_REQUEST", {
              message:
                "El registro está deshabilitado. El administrador debe configurar ADMIN_EMAILS en el servidor.",
            });
          }

          if (!adminEmails.includes(userEmail)) {
            throw new APIError("FORBIDDEN", {
              message:
                "Este email no tiene autorización para acceder al backoffice.",
            });
          }

          // Email autorizado → asignar rol ADMIN automáticamente
          return {
            data: {
              ...user,
              role: "ADMIN",
            },
          };
        },
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
