/**
 * Debe importarse ANTES de AppModule (ver main.ts).
 * Sin SENTRY_DSN no hace nada (dev local sin fricción).
 */
import * as Sentry from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN?.trim();

// Header/query names Sentry v10 scrubbed by default (client IP, proxies, users).
const PII_NAME_DENYLIST = ['forwarded', '-ip', 'remote-', 'via', '-user'];

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    // Send no PII. Sentry v11 replaced `sendDefaultPii` with `dataCollection`
    // and collects user info, cookies and bodies when it is unset, so this
    // pins the v10 `sendDefaultPii: false` baseline from the v11 migration guide.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: {
        request: { deny: PII_NAME_DENYLIST },
        response: { deny: PII_NAME_DENYLIST },
      },
      httpBodies: [],
      urlQueryParams: { deny: PII_NAME_DENYLIST },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      graphQL: { document: false, variables: false },
    },
    // `httpBodies` only gates the raw-body capture. A parsed `req.body` still
    // reaches events and spans (seen under the Bun runtime the Docker image
    // uses), and this read-time override is the only switch that drops it.
    integrations: [Sentry.requestDataIntegration({ include: { data: false } })],
  });
}
