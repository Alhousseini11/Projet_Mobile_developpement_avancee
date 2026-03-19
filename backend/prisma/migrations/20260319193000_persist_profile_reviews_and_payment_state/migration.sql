ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
UPDATE "Review" SET "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP);
ALTER TABLE "Review" ALTER COLUMN "updatedAt" SET NOT NULL;

WITH ranked_reviews AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "reservationId"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS row_number
  FROM "Review"
)
DELETE FROM "Review"
WHERE "id" IN (
  SELECT "id"
  FROM ranked_reviews
  WHERE row_number > 1
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Review_userId_reservationId_key'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'Review_userId_reservationId_key'
  ) THEN
    CREATE UNIQUE INDEX "Review_userId_reservationId_key" ON "Review"("userId", "reservationId");
  END IF;
END $$;

ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "lastCheckoutSessionId" TEXT;
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMP(3);
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3);
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

UPDATE "PaymentMethod"
SET
  "provider" = COALESCE(NULLIF(BTRIM("provider"), ''), 'stripe'),
  "status" = COALESCE(NULLIF(BTRIM("status"), ''), CASE WHEN "last4" IS NULL THEN 'not_configured' ELSE 'ready' END),
  "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP),
  "updatedAt" = COALESCE("updatedAt", COALESCE("lastSyncAt", "createdAt", CURRENT_TIMESTAMP));

WITH ranked_payment_methods AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "userId"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS row_number
  FROM "PaymentMethod"
)
DELETE FROM "PaymentMethod"
WHERE "id" IN (
  SELECT "id"
  FROM ranked_payment_methods
  WHERE row_number > 1
);

ALTER TABLE "PaymentMethod" ALTER COLUMN "provider" SET NOT NULL;
ALTER TABLE "PaymentMethod" ALTER COLUMN "provider" SET DEFAULT 'stripe';
ALTER TABLE "PaymentMethod" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "PaymentMethod" ALTER COLUMN "status" SET DEFAULT 'not_configured';
ALTER TABLE "PaymentMethod" ALTER COLUMN "createdAt" SET NOT NULL;
ALTER TABLE "PaymentMethod" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "PaymentMethod" ALTER COLUMN "updatedAt" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'PaymentMethod_userId_key'
  ) THEN
    CREATE UNIQUE INDEX "PaymentMethod_userId_key" ON "PaymentMethod"("userId");
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "UserProfileSettings" (
  "userId" TEXT NOT NULL,
  "membershipLabel" TEXT,
  "verified" BOOLEAN,
  "memberSince" TIMESTAMP(3),
  "preferredGarage" TEXT,
  "defaultVehicleLabel" TEXT,
  "loyaltyPoints" INTEGER,
  "addressLine" TEXT,
  "city" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserProfileSettings_pkey" PRIMARY KEY ("userId")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserProfileSettings_userId_fkey'
  ) THEN
    ALTER TABLE "UserProfileSettings"
      ADD CONSTRAINT "UserProfileSettings_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
