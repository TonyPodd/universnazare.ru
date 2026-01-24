-- Add ONLINE payment method and payment metadata for orders
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'ONLINE';

ALTER TABLE "orders" ADD COLUMN "paymentId" TEXT;
ALTER TABLE "orders" ADD COLUMN "paymentUrl" TEXT;
ALTER TABLE "orders" ADD COLUMN "paymentStatus" TEXT;
