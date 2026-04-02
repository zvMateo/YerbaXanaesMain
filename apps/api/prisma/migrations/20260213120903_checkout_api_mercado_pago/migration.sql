-- CreateEnum
CREATE TYPE "PaymentLinkStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'MERCADOPAGO_API';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "mercadoPagoOrderId" TEXT;

-- CreateTable
CREATE TABLE "PaymentLink" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "currencyId" TEXT NOT NULL DEFAULT 'ARS',
    "preferenceId" TEXT NOT NULL,
    "initPoint" TEXT NOT NULL,
    "sandboxInitPoint" TEXT,
    "expirationDate" TIMESTAMP(3),
    "externalReference" TEXT,
    "status" "PaymentLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "totalPayments" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLink_preferenceId_key" ON "PaymentLink"("preferenceId");
