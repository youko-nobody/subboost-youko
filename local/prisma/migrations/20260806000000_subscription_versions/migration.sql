CREATE TABLE "SubscriptionVersion" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "encryptedUrls" TEXT NOT NULL,
  "encryptedNodes" TEXT NOT NULL,
  "encryptedConfig" TEXT NOT NULL,
  "encryptedSubscriptionInfo" TEXT,
  "autoUpdateInterval" INTEGER,
  "nodeCount" INTEGER NOT NULL DEFAULT 0,
  "sourceCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SubscriptionVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SubscriptionVersion_subscriptionId_createdAt_idx" ON "SubscriptionVersion"("subscriptionId", "createdAt");
CREATE INDEX "SubscriptionVersion_ownerId_createdAt_idx" ON "SubscriptionVersion"("ownerId", "createdAt");

ALTER TABLE "SubscriptionVersion"
  ADD CONSTRAINT "SubscriptionVersion_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubscriptionVersion"
  ADD CONSTRAINT "SubscriptionVersion_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "LocalAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
