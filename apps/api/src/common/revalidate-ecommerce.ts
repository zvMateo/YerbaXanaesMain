import { Logger } from '@nestjs/common';

const logger = new Logger('RevalidateEcommerce');

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

  void fetch(`${baseUrl}/api/revalidate?tag=${encodeURIComponent(tag)}`, {
    method: 'POST',
    headers: { 'x-revalidate-secret': secret },
  }).catch((error: unknown) => {
    logger.warn(
      `No se pudo revalidar el catálogo del ecommerce: ${
        error instanceof Error ? error.message : 'error desconocido'
      }`,
    );
  });
}
