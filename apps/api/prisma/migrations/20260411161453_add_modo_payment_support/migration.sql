-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'MODO';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StateChangeSource" ADD VALUE 'WEBHOOK_MODO';
ALTER TYPE "StateChangeSource" ADD VALUE 'MODO_PAYMENT_API';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "modoCheckoutId" TEXT;
