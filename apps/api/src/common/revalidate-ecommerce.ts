import { Logger } from '@nestjs/common';
import { fetchWithTimeout } from './fetch-with-timeout';

const logger = new Logger('RevalidateEcommerce');

// Revalidar es best-effort: si el ecommerce no contesta rápido se cae al ISR
// por tiempo, pero nada del API depende de esta llamada.
const REVALIDATE_TIMEOUT_MS = 5_000;

/**
 * Dispara la revalidación on-demand del catálogo del ecommerce (Next.js ISR)
 * vía su route handler POST /api/revalidate.
 *
 * Fire-and-forget: nunca bloquea ni hace fallar la operación que la origina.
 * Requiere FRONTEND_URL (URL del ecommerce) y REVALIDATE_SECRET. Si faltan
 * (ej. dev sin ecommerce levantado), es un no-op silencioso.
 */
export function revalidateEcommerceCatalog(tag = 'products'): void {
  const baseUrl = process.env.FRONTEND_URL;
  const secret = process.env.REVALIDATE_SECRET;

  if (!baseUrl || !secret) {
    return;
  }

  void fetchWithTimeout(
    `${baseUrl}/api/revalidate?tag=${encodeURIComponent(tag)}`,
    {
      method: 'POST',
      headers: { 'x-revalidate-secret': secret },
    },
    REVALIDATE_TIMEOUT_MS,
  ).catch((error: unknown) => {
    logger.warn(
      `No se pudo revalidar el catálogo del ecommerce: ${
        error instanceof Error ? error.message : 'error desconocido'
      }`,
    );
  });
}
