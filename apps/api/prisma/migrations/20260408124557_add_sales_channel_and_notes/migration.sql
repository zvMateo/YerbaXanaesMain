-- CreateEnum
CREATE TYPE "SalesChannel" AS ENUM ('ONLINE', 'STORE', 'INSTAGRAM', 'WHATSAPP', 'FAIR');

-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "channel" "SalesChannel" DEFAULT 'ONLINE',
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "ProductVariant" ALTER COLUMN "updatedAt" DROP DEFAULT;
