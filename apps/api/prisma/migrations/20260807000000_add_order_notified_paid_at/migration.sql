-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "notifiedPaidAt" TIMESTAMP(3);
