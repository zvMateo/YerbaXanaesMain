import { join } from 'node:path';
import { Client } from 'pg';
import { buildPgPoolOptions } from './pg-pool-options';

// The backoffice keeps its own copy (apps do not share runtime code); run every
// case against both so the copies cannot drift apart. Loaded at runtime so
// `tsc` does not pull a file from outside this app into the API program.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const backofficeCopy = require(
  join(__dirname, '../../../backoffice/lib/pg-pool-options'),
) as { buildPgPoolOptions: typeof buildPgPoolOptions };

/** The `ssl` value node-postgres derives from the rewritten connection string. */
function sslFor(connectionString: string): unknown {
  return new Client({ connectionString }).ssl;
}

describe.each([
  ['api', buildPgPoolOptions],
  ['backoffice', backofficeCopy.buildPgPoolOptions],
])('buildPgPoolOptions (%s)', (_name, build) => {
  it('applies conservative defaults when the URL sets no pool limits', () => {
    const options = build('postgresql://user:pass@db.internal:5432/shop');

    expect(options).toEqual({
      connectionString: 'postgresql://user:pass@db.internal:5432/shop',
      max: 5,
      connectionTimeoutMillis: 10_000,
    });
  });

  it('honors explicit connection_limit and pool_timeout and strips them from the URL', () => {
    const options = build(
      'postgresql://user:pass@db.internal:5432/shop?connection_limit=12&pool_timeout=3&sslmode=verify-full',
    );

    expect(options.max).toBe(12);
    expect(options.connectionTimeoutMillis).toBe(3_000);
    expect(options.connectionString).toBe(
      'postgresql://user:pass@db.internal:5432/shop?sslmode=verify-full',
    );
  });

  it('keeps pool_timeout=0 as "no timeout", like the previous Prisma engine', () => {
    const options = build(
      'postgresql://user:pass@db.internal:5432/shop?pool_timeout=0',
    );

    expect(options.connectionTimeoutMillis).toBe(0);
  });

  it('falls back to defaults when the limits are not valid numbers', () => {
    const options = build(
      'postgresql://user:pass@db.internal:5432/shop?connection_limit=abc&pool_timeout=-1',
    );

    expect(options.max).toBe(5);
    expect(options.connectionTimeoutMillis).toBe(10_000);
  });

  it('passes an unparseable connection string through unchanged', () => {
    const options = build('not a url');

    expect(options.connectionString).toBe('not a url');
    expect(options.max).toBe(5);
  });

  describe('TLS (the Prisma 6 engine defaulted to sslmode=prefer without verifying certificates)', () => {
    it('encrypts a public host without verifying its certificate when sslmode is absent', () => {
      const { connectionString } = build(
        'postgresql://user:pass@shuttle.proxy.rlwy.net:41234/railway',
      );

      expect(connectionString).toBe(
        'postgresql://user:pass@shuttle.proxy.rlwy.net:41234/railway?sslmode=no-verify',
      );
      expect(sslFor(connectionString)).toEqual({ rejectUnauthorized: false });
    });

    it.each([
      'postgresql://user:pass@localhost:5433/shop',
      'postgresql://user:pass@127.0.0.1:5432/shop',
      'postgresql://user:pass@[::1]:5432/shop',
      'postgresql://user:pass@postgres:5432/shop',
      'postgresql://user:pass@postgres.railway.internal:5432/railway',
    ])('keeps plaintext for the private-network host in %s', (url) => {
      const { connectionString } = build(url);

      expect(connectionString).toBe(url);
      expect(sslFor(connectionString)).toBe(false);
    });

    it.each(['prefer', 'require'])(
      'accepts self-signed certificates for sslmode=%s, as the previous engine did',
      (mode) => {
        const { connectionString } = build(
          `postgresql://user:pass@localhost:5432/shop?sslmode=${mode}`,
        );

        expect(connectionString).toBe(
          'postgresql://user:pass@localhost:5432/shop?sslmode=no-verify',
        );
        expect(sslFor(connectionString)).toEqual({ rejectUnauthorized: false });
      },
    );

    it.each(['disable', 'verify-ca', 'verify-full', 'no-verify'])(
      'leaves an explicit sslmode=%s untouched',
      (mode) => {
        const url = `postgresql://user:pass@db.example.com:5432/shop?sslmode=${mode}`;

        expect(build(url).connectionString).toBe(url);
      },
    );

    it('verifies certificates when the URL asks for sslaccept=strict', () => {
      const { connectionString } = build(
        'postgresql://user:pass@db.example.com:5432/shop?sslmode=require&sslaccept=strict',
      );

      expect(connectionString).toBe(
        'postgresql://user:pass@db.example.com:5432/shop?sslmode=verify-full',
      );
      expect(sslFor(connectionString)).toEqual({});
    });

    it.each([
      'sslmode=require&sslrootcert=%2Fcerts%2Fca.pem',
      'sslmode=require&uselibpqcompat=true',
      'ssl=true',
    ])('leaves node-postgres TLS settings untouched in %s', (query) => {
      const url = `postgresql://user:pass@db.example.com:5432/shop?${query}`;

      expect(build(url).connectionString).toBe(url);
    });
  });
});
