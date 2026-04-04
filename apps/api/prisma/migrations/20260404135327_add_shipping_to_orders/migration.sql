-- Migration: add_shipping_to_orders
-- Agrega campos de envío a Order y peso a ProductVariant
-- para integración con Correo Argentino

-- 1. Peso por variante (para calcular tarifa de envío)
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "weight" INTEGER;

-- 2. Datos de entrega en la orden
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryType"         TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingAddress"      TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingCity"         TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingProvinceCode" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingZip"          TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingCost"         DECIMAL(10,2);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingProvider"     TEXT;

-- 3. Tracking de Correo Argentino
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingNumber"       TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "correoShippingId"     TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "correoImportedAt"     TIMESTAMP(3);
