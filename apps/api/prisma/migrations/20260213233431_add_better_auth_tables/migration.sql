/*
  Warnings:

  - The values [PROCESSING,SHIPPED,DELIVERED] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `channel` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `mercadoPagoOrderId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `mercadoPagoPaymentId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `mercadoPagoPreferenceId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `mercadoPagoStatus` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the `PaymentLink` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `customerEmail` on table `Order` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MERCADOPAGO', 'CASH', 'TRANSFER');

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'PAID', 'REJECTED', 'CANCELLED', 'REFUNDED');
ALTER TABLE "public"."Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "channel",
DROP COLUMN "mercadoPagoOrderId",
DROP COLUMN "mercadoPagoPaymentId",
DROP COLUMN "mercadoPagoPreferenceId",
DROP COLUMN "mercadoPagoStatus",
DROP COLUMN "paymentMethod",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "mpCardToken" TEXT,
ADD COLUMN     "mpPaymentId" TEXT,
ADD COLUMN     "mpStatus" TEXT,
ADD COLUMN     "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'MERCADOPAGO',
ALTER COLUMN "customerEmail" SET NOT NULL;

-- DropTable
DROP TABLE "PaymentLink";

-- DropEnum
DROP TYPE "PaymentLinkStatus";

-- DropEnum
DROP TYPE "PaymentMethod";

-- DropEnum
DROP TYPE "SalesChannel";

-- CreateIndex
CREATE INDEX "Order_customerEmail_idx" ON "Order"("customerEmail");

-- CreateIndex
CREATE INDEX "Order_mpPaymentId_idx" ON "Order"("mpPaymentId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
