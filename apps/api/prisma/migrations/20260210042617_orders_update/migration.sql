-- CreateEnum
CREATE TYPE "SalesChannel" AS ENUM ('ONLINE', 'STORE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MERCADOPAGO', 'CASH', 'TRANSFER', 'OTHER');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "channel" "SalesChannel" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'MERCADOPAGO';
