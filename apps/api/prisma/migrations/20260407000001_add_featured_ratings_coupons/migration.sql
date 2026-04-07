-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- AlterEnum: Add new OrderStatus values
ALTER TYPE "OrderStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "OrderStatus" ADD VALUE 'SHIPPED';
ALTER TYPE "OrderStatus" ADD VALUE 'DELIVERED';

-- AlterTable Category
ALTER TABLE "Category"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable Product
ALTER TABLE "Product"
  ADD COLUMN "isFeatured"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "metaDescription" TEXT,
  ADD COLUMN "metaTitle"       TEXT;

-- AlterTable ProductVariant
ALTER TABLE "ProductVariant"
  ADD COLUMN "costPrice"  DECIMAL(10,2),
  ADD COLUMN "sku"        TEXT,
  ADD COLUMN "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable ProductRating
CREATE TABLE "ProductRating" (
    "id"         TEXT NOT NULL,
    "productId"  TEXT NOT NULL,
    "userId"     TEXT,
    "orderId"    TEXT,
    "rating"     INTEGER NOT NULL,
    "comment"    TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable Coupon
CREATE TABLE "Coupon" (
    "id"             TEXT NOT NULL,
    "code"           TEXT NOT NULL,
    "discountType"   "DiscountType" NOT NULL,
    "discountValue"  DECIMAL(10,2) NOT NULL,
    "minOrderAmount" DECIMAL(10,2),
    "maxUses"        INTEGER,
    "currentUses"    INTEGER NOT NULL DEFAULT 0,
    "expiresAt"      TIMESTAMP(3),
    "isActive"       BOOLEAN NOT NULL DEFAULT true,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable OrderDiscount
CREATE TABLE "OrderDiscount" (
    "id"             TEXT NOT NULL,
    "orderId"        TEXT NOT NULL,
    "couponId"       TEXT NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL,
    CONSTRAINT "OrderDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductRating_productId_idx" ON "ProductRating"("productId");
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
CREATE UNIQUE INDEX "OrderDiscount_orderId_key" ON "OrderDiscount"("orderId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");
CREATE UNIQUE INDEX "VariantIngredient_variantId_inventoryItemId_key" ON "VariantIngredient"("variantId", "inventoryItemId");

-- AddForeignKey
ALTER TABLE "ProductRating" ADD CONSTRAINT "ProductRating_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductRating" ADD CONSTRAINT "ProductRating_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderDiscount" ADD CONSTRAINT "OrderDiscount_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderDiscount" ADD CONSTRAINT "OrderDiscount_couponId_fkey"
  FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
