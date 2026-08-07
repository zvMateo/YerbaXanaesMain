import * as Sentry from "@sentry/browser";

let initialized = false;

/** Inicializa Sentry en el browser solo si hay DSN público. */
export function initSentry(): void {
  if (initialized || typeof window === "undefined") return;
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
  initialized = true;
}

export function captureClientError(error: unknown): void {
  initSentry();
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) return;
  Sentry.captureException(error);
}
