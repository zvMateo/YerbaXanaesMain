/*
  Warnings:

  - You are about to drop the column `lastStateChangeAt` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `lastStateChangeReason` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `manualOverride` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `mpOrderStatusDetail` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `mpStatus` on the `OrderStateChange` table. All the data in the column will be lost.
  - The `reason` column on the `OrderStateChange` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `source` to the `OrderStateChange` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StateChangeSource" AS ENUM ('WEBHOOK_MERCADOPAGO', 'CHECKOUT_REDIRECT', 'CARD_PAYMENT_API', 'CHECKOUT_VALIDATION', 'CLEANUP_TIMEOUT', 'MANUAL_OVERRIDE', 'PAYMENT_REJECTED', 'RECONCILIATION', 'SYSTEM_ERROR');

-- DropIndex
DROP INDEX "OrderStateChange_reason_idx";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "lastStateChangeAt",
DROP COLUMN "lastStateChangeReason",
DROP COLUMN "manualOverride",
DROP COLUMN "mpOrderStatusDetail",
ADD COLUMN     "manualOverrideAt" TIMESTAMP(3),
ADD COLUMN     "manualOverrideReason" TEXT;

-- AlterTable
ALTER TABLE "OrderStateChange" DROP COLUMN "mpStatus",
ADD COLUMN     "changedByEmail" TEXT,
ADD COLUMN     "mpPaymentId" TEXT,
ADD COLUMN     "mpRawStatus" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "source" "StateChangeSource" NOT NULL,
DROP COLUMN "reason",
ADD COLUMN     "reason" TEXT;

-- DropEnum
DROP TYPE "MercadoPagoOrderStatus";

-- DropEnum
DROP TYPE "StateChangeReason";

-- CreateIndex
CREATE INDEX "OrderStateChange_source_idx" ON "OrderStateChange"("source");

-- CreateIndex
CREATE INDEX "OrderStateChange_mpPaymentId_idx" ON "OrderStateChange"("mpPaymentId");
