-- Add subscription linkage and rollback marker to subscription payments
ALTER TABLE "subscription_payments"
  ADD COLUMN "subscriptionId" TEXT,
  ADD COLUMN "rolledBackAt" TIMESTAMP(3);

-- Link subscription payments to subscriptions when available
ALTER TABLE "subscription_payments"
  ADD CONSTRAINT "subscription_payments_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
