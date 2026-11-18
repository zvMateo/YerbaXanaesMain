// Railway Hobby has a low Postgres connection quota, so the pool stays small
// unless DATABASE_URL asks for something else.
const DEFAULT_MAX_CONNECTIONS = 5;
const DEFAULT_POOL_TIMEOUT_SECONDS = 10;

export interface PgPoolOptions {
  connectionString: string;
  max: number;
  connectionTimeoutMillis: number;
}

function parseInteger(value: string | null, min: number): number | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return parsed >= min ? parsed : undefined;
}

/** Loopback, Docker service names and `*.internal` (e.g. Railway's private network). */
function isPrivateNetworkHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host.includes(':')) return host === '::1';
  return (
    host === 'localhost' ||
    host.startsWith('127.') ||
    !host.includes('.') ||
    host.endsWith('.internal')
  );
}

/**
 * The Prisma 6 engine defaulted to `sslmode=prefer` and did not verify the
 * server certificate unless `sslaccept=strict`. `pg` skips TLS when sslmode is
 * absent and treats prefer/require as verify-full, which rejects the
 * self-signed certificates managed Postgres often uses. The mode is rewritten
 * in the URL (pg lets URL params override explicit options) to keep the old
 * behavior; private-network hosts keep plaintext. Explicit node-postgres TLS
 * settings (`ssl`, `sslrootcert`, `uselibpqcompat`) are left alone.
 */
function applyPrismaSslDefaults(url: URL): void {
  const params = url.searchParams;
  const strict = params.get('sslaccept') === 'strict';
  params.delete('sslaccept');

  if (['ssl', 'sslrootcert', 'uselibpqcompat'].some((p) => params.has(p))) {
    return;
  }

  const mode = params.get('sslmode');
  const encrypt =
    mode === 'prefer' ||
    mode === 'require' ||
    (mode === null && !isPrivateNetworkHost(url.hostname));
  if (encrypt) params.set('sslmode', strict ? 'verify-full' : 'no-verify');
}

/**
 * Prisma 7 talks to Postgres through node-postgres (`pg`). The engine-only URL
 * params `connection_limit` and `pool_timeout` mean nothing to `pg`, so they are
 * translated into pool options and removed from the connection string; TLS
 * params are mapped as described in `applyPrismaSslDefaults`.
 */
export function buildPgPoolOptions(rawUrl: string): PgPoolOptions {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return {
      connectionString: rawUrl,
      max: DEFAULT_MAX_CONNECTIONS,
      connectionTimeoutMillis: DEFAULT_POOL_TIMEOUT_SECONDS * 1000,
    };
  }

  const max =
    parseInteger(url.searchParams.get('connection_limit'), 1) ??
    DEFAULT_MAX_CONNECTIONS;
  // pool_timeout=0 meant "wait forever" in the Prisma engine; 0 means the same in pg.
  const timeoutSeconds =
    parseInteger(url.searchParams.get('pool_timeout'), 0) ??
    DEFAULT_POOL_TIMEOUT_SECONDS;

  url.searchParams.delete('connection_limit');
  url.searchParams.delete('pool_timeout');
  applyPrismaSslDefaults(url);

  return {
    connectionString: url.toString(),
    max,
    connectionTimeoutMillis: timeoutSeconds * 1000,
  };
}
