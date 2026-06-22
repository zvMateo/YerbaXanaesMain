-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "businessName" TEXT NOT NULL DEFAULT 'YerbaXanaes',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "shippingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "shippingFlatRate" INTEGER NOT NULL DEFAULT 1500,
    "freeShippingThreshold" INTEGER NOT NULL DEFAULT 15000,
    "paymentMercadoPago" BOOLEAN NOT NULL DEFAULT true,
    "paymentCash" BOOLEAN NOT NULL DEFAULT true,
    "paymentTransfer" BOOLEAN NOT NULL DEFAULT true,
    "notificationEmail" TEXT NOT NULL DEFAULT '',
    "lowStockAlert" BOOLEAN NOT NULL DEFAULT true,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "dataId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookLog_dataId_type_idx" ON "WebhookLog"("dataId", "type");

-- CreateIndex
CREATE INDEX "WebhookLog_processedAt_idx" ON "WebhookLog"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookLog_requestId_type_key" ON "WebhookLog"("requestId", "type");

-- CreateIndex
CREATE INDEX "Order_deletedAt_idx" ON "Order"("deletedAt");

-- CreateIndex
CREATE INDEX "Order_status_deletedAt_idx" ON "Order"("status", "deletedAt");
