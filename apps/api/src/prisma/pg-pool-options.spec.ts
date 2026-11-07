import { buildPgPoolOptions } from './pg-pool-options';

describe('buildPgPoolOptions', () => {
  it('applies conservative defaults when the URL sets no pool limits', () => {
    const options = buildPgPoolOptions(
      'postgresql://user:pass@db.internal:5432/shop',
    );

    expect(options).toEqual({
      connectionString: 'postgresql://user:pass@db.internal:5432/shop',
      max: 5,
      connectionTimeoutMillis: 10_000,
    });
  });

  it('honors explicit connection_limit and pool_timeout and strips them from the URL', () => {
    const options = buildPgPoolOptions(
      'postgresql://user:pass@db.internal:5432/shop?connection_limit=12&pool_timeout=3&sslmode=require',
    );

    expect(options.max).toBe(12);
    expect(options.connectionTimeoutMillis).toBe(3_000);
    expect(options.connectionString).toBe(
      'postgresql://user:pass@db.internal:5432/shop?sslmode=require',
    );
  });

  it('keeps pool_timeout=0 as "no timeout", like the previous Prisma engine', () => {
    const options = buildPgPoolOptions(
      'postgresql://user:pass@db.internal:5432/shop?pool_timeout=0',
    );

    expect(options.connectionTimeoutMillis).toBe(0);
  });

  it('falls back to defaults when the limits are not valid numbers', () => {
    const options = buildPgPoolOptions(
      'postgresql://user:pass@db.internal:5432/shop?connection_limit=abc&pool_timeout=-1',
    );

    expect(options.max).toBe(5);
    expect(options.connectionTimeoutMillis).toBe(10_000);
  });

  it('passes an unparseable connection string through unchanged', () => {
    const options = buildPgPoolOptions('not a url');

    expect(options.connectionString).toBe('not a url');
    expect(options.max).toBe(5);
  });
});
