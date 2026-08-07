/**
 * Debe importarse ANTES de AppModule (ver main.ts).
 * Sin SENTRY_DSN no hace nada (dev local sin fricción).
 */
import * as Sentry from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    // No enviar PII por defecto
    sendDefaultPii: false,
  });
}
