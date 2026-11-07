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

/**
 * Prisma 7 talks to Postgres through node-postgres (`pg`). The engine-only URL
 * params `connection_limit` and `pool_timeout` mean nothing to `pg`, so they are
 * translated into pool options and removed from the connection string.
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

  return {
    connectionString: url.toString(),
    max,
    connectionTimeoutMillis: timeoutSeconds * 1000,
  };
}
