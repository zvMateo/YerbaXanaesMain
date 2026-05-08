-- Remove MODO payment support from the schema.
-- Safety: fail fast if production still contains historical MODO rows.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Order" WHERE "paymentProvider"::text = 'MODO') THEN
    RAISE EXCEPTION 'Cannot remove MODO: existing orders use paymentProvider=MODO';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "OrderStateChange"
    WHERE "source"::text IN ('WEBHOOK_MODO', 'MODO_PAYMENT_API')
  ) THEN
    RAISE EXCEPTION 'Cannot remove MODO: existing order state changes reference MODO sources';
  END IF;
END $$;

-- Remove MODO-specific column.
ALTER TABLE "Order" DROP COLUMN IF EXISTS "modoCheckoutId";

-- Recreate PaymentProvider enum without MODO.
ALTER TABLE "Order" ALTER COLUMN "paymentProvider" DROP DEFAULT;
ALTER TYPE "PaymentProvider" RENAME TO "PaymentProvider_old";
CREATE TYPE "PaymentProvider" AS ENUM ('MERCADOPAGO', 'CASH', 'TRANSFER');
ALTER TABLE "Order"
  ALTER COLUMN "paymentProvider" TYPE "PaymentProvider"
  USING ("paymentProvider"::text::"PaymentProvider");
ALTER TABLE "Order" ALTER COLUMN "paymentProvider" SET DEFAULT 'MERCADOPAGO';
DROP TYPE "PaymentProvider_old";

-- Recreate StateChangeSource enum without MODO sources.
ALTER TYPE "StateChangeSource" RENAME TO "StateChangeSource_old";
CREATE TYPE "StateChangeSource" AS ENUM (
  'WEBHOOK_MERCADOPAGO',
  'CHECKOUT_REDIRECT',
  'CARD_PAYMENT_API',
  'CHECKOUT_VALIDATION',
  'CLEANUP_TIMEOUT',
  'MANUAL_OVERRIDE',
  'PAYMENT_REJECTED',
  'RECONCILIATION',
  'SYSTEM_ERROR'
);
ALTER TABLE "OrderStateChange"
  ALTER COLUMN "source" TYPE "StateChangeSource"
  USING ("source"::text::"StateChangeSource");
DROP TYPE "StateChangeSource_old";
