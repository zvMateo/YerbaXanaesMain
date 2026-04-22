-- CreateEnum
CREATE TYPE "MercadoPagoOrderStatus" AS ENUM ('PENDING', 'IN_PROCESS', 'AUTHORIZED', 'PROCESSED', 'REJECTED', 'CANCELLED', 'REFUNDED', 'EXPIRED', 'CLOSED');

-- CreateEnum
CREATE TYPE "StateChangeReason" AS ENUM ('WEBHOOK_PAYMENT_APPROVED', 'WEBHOOK_PAYMENT_REJECTED', 'WEBHOOK_PAYMENT_PENDING', 'WEBHOOK_ORDER_CREATED', 'WEBHOOK_ORDER_UPDATED', 'MANUAL_OVERRIDE_BACKOFFICE', 'AUTO_CLEANUP_EXPIRED', 'AUTO_RECONCILIATION_SYNC', 'AUTO_CARD_PAYMENT_APPROVED', 'AUTO_CARD_PAYMENT_REJECTED', 'ERROR_PREFERENCE_CREATION', 'ERROR_STOCK_INSUFFICIENT');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "lastStateChangeAt" TIMESTAMP(3),
ADD COLUMN     "lastStateChangeReason" "StateChangeReason",
ADD COLUMN     "manualOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mpOrderStatusDetail" "MercadoPagoOrderStatus";

-- CreateTable
CREATE TABLE "OrderStateChange" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" "OrderStatus" NOT NULL,
    "toStatus" "OrderStatus" NOT NULL,
    "reason" "StateChangeReason" NOT NULL,
    "mpOrderId" TEXT,
    "mpStatus" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStateChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderStateChange_orderId_idx" ON "OrderStateChange"("orderId");

-- CreateIndex
CREATE INDEX "OrderStateChange_createdAt_idx" ON "OrderStateChange"("createdAt");

-- CreateIndex
CREATE INDEX "OrderStateChange_reason_idx" ON "OrderStateChange"("reason");

-- AddForeignKey
ALTER TABLE "OrderStateChange" ADD CONSTRAINT "OrderStateChange_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
