-- Manual catch-up migration from the legacy production schema to the current Prisma datamodel.
-- It backfills required columns and preserves existing rows so the app can progressively stop
-- relying on legacy fallbacks.

DO $$
BEGIN
  CREATE TYPE "VehicleType" AS ENUM ('sedan', 'suv', 'truck', 'minivan', 'coupe', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "TutorialCategory" AS ENUM ('entretien', 'freins', 'suspension', 'batterie', 'diagnostic', 'eclairage', 'fluide', 'mecanique');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "MaintenanceType" AS ENUM ('oil_change', 'tire_rotation', 'brake_service', 'battery_replacement', 'filter_change', 'inspection', 'repair', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "DocumentType" AS ENUM ('registration', 'insurance', 'mot', 'service_history', 'warranty', 'inspection', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'TutorialDifficulty'
      AND e.enumlabel = 'EASY'
  ) THEN
    CREATE TYPE "TutorialDifficulty_new" AS ENUM ('facile', 'moyen', 'difficile');

    ALTER TABLE "Tutorial"
      ALTER COLUMN "difficulty" TYPE "TutorialDifficulty_new"
      USING (
        CASE "difficulty"::text
          WHEN 'EASY' THEN 'facile'
          WHEN 'MEDIUM' THEN 'moyen'
          WHEN 'HARD' THEN 'difficile'
          ELSE 'moyen'
        END
      )::"TutorialDifficulty_new";

    ALTER TYPE "TutorialDifficulty" RENAME TO "TutorialDifficulty_old";
    ALTER TYPE "TutorialDifficulty_new" RENAME TO "TutorialDifficulty";
    DROP TYPE "TutorialDifficulty_old";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Vehicle'
      AND column_name = 'brand'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Vehicle'
      AND column_name = 'name'
  ) THEN
    ALTER TABLE "Vehicle" RENAME COLUMN "brand" TO "name";
  END IF;
END $$;

ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "type" "VehicleType";
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "licensePlate" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "fuelType" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "vin" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "color" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3);
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

UPDATE "Vehicle"
SET
  "name" = COALESCE(NULLIF(BTRIM("name"), ''), 'Vehicule'),
  "mileage" = COALESCE("mileage", 0),
  "type" = COALESCE("type", 'sedan'::"VehicleType"),
  "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP),
  "updatedAt" = COALESCE("updatedAt", COALESCE("createdAt", CURRENT_TIMESTAMP));

ALTER TABLE "Vehicle" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "Vehicle" ALTER COLUMN "mileage" SET NOT NULL;
ALTER TABLE "Vehicle" ALTER COLUMN "type" SET NOT NULL;
ALTER TABLE "Vehicle" ALTER COLUMN "createdAt" SET NOT NULL;
ALTER TABLE "Vehicle" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Vehicle" ALTER COLUMN "updatedAt" SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Tutorial'
      AND column_name = 'category'
      AND udt_name = 'text'
  ) THEN
    ALTER TABLE "Tutorial" ADD COLUMN IF NOT EXISTS "category_new" "TutorialCategory";

    UPDATE "Tutorial"
    SET "category_new" = CASE LOWER(COALESCE("category", ''))
      WHEN 'freins' THEN 'freins'::"TutorialCategory"
      WHEN 'suspension' THEN 'suspension'::"TutorialCategory"
      WHEN 'batterie' THEN 'batterie'::"TutorialCategory"
      WHEN 'battery' THEN 'batterie'::"TutorialCategory"
      WHEN 'diagnostic' THEN 'diagnostic'::"TutorialCategory"
      WHEN 'eclairage' THEN 'eclairage'::"TutorialCategory"
      WHEN 'lighting' THEN 'eclairage'::"TutorialCategory"
      WHEN 'fluide' THEN 'fluide'::"TutorialCategory"
      WHEN 'fluid' THEN 'fluide'::"TutorialCategory"
      WHEN 'mecanique' THEN 'mecanique'::"TutorialCategory"
      WHEN 'mechanique' THEN 'mecanique'::"TutorialCategory"
      WHEN 'mechanic' THEN 'mecanique'::"TutorialCategory"
      ELSE 'entretien'::"TutorialCategory"
    END;

    ALTER TABLE "Tutorial" DROP COLUMN "category";
    ALTER TABLE "Tutorial" RENAME COLUMN "category_new" TO "category";
  ELSIF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Tutorial'
      AND column_name = 'category'
  ) THEN
    ALTER TABLE "Tutorial" ADD COLUMN "category" "TutorialCategory";
    UPDATE "Tutorial" SET "category" = 'entretien'::"TutorialCategory";
  END IF;
END $$;

ALTER TABLE "Tutorial" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Tutorial" ADD COLUMN IF NOT EXISTS "duration" INTEGER;
ALTER TABLE "Tutorial" ADD COLUMN IF NOT EXISTS "views" INTEGER;
ALTER TABLE "Tutorial" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION;
ALTER TABLE "Tutorial" ADD COLUMN IF NOT EXISTS "instructions" JSONB;
ALTER TABLE "Tutorial" ADD COLUMN IF NOT EXISTS "tools" JSONB;
ALTER TABLE "Tutorial" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Tutorial'
      AND column_name = 'durationSec'
  ) THEN
    EXECUTE '
      UPDATE "Tutorial"
      SET "duration" = COALESCE(
        "duration",
        CASE
          WHEN "durationSec" IS NULL THEN 0
          ELSE GREATEST(1, ROUND("durationSec" / 60.0))::int
        END
      )';

    ALTER TABLE "Tutorial" DROP COLUMN "durationSec";
  END IF;
END $$;

UPDATE "Tutorial"
SET
  "description" = COALESCE(NULLIF(BTRIM("description"), ''), 'Tutoriel atelier disponible sur cette deployment legacy.'),
  "duration" = COALESCE("duration", 0),
  "views" = COALESCE("views", 0),
  "rating" = COALESCE("rating", 0),
  "instructions" = COALESCE("instructions", '[]'::jsonb),
  "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP),
  "thumbnail" = COALESCE(NULLIF("thumbnail", ''), 'res://logo');

ALTER TABLE "Tutorial" ALTER COLUMN "description" SET NOT NULL;
ALTER TABLE "Tutorial" ALTER COLUMN "duration" SET NOT NULL;
ALTER TABLE "Tutorial" ALTER COLUMN "views" SET NOT NULL;
ALTER TABLE "Tutorial" ALTER COLUMN "views" SET DEFAULT 0;
ALTER TABLE "Tutorial" ALTER COLUMN "rating" SET NOT NULL;
ALTER TABLE "Tutorial" ALTER COLUMN "rating" SET DEFAULT 0;
ALTER TABLE "Tutorial" ALTER COLUMN "instructions" SET NOT NULL;
ALTER TABLE "Tutorial" ALTER COLUMN "thumbnail" SET NOT NULL;
ALTER TABLE "Tutorial" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "Tutorial" ALTER COLUMN "category" SET NOT NULL;

ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "vehicleId" TEXT;

CREATE TABLE IF NOT EXISTS "MaintenanceRecord" (
  "id" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "type" "MaintenanceType" NOT NULL,
  "description" TEXT NOT NULL,
  "mileage" INTEGER NOT NULL,
  "cost" DECIMAL(10,2) NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "nextMaintenanceKm" INTEGER,
  "nextMaintenanceDate" TIMESTAMP(3),
  "attachments" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VehicleDocument" (
  "id" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "type" "DocumentType" NOT NULL,
  "title" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "expiryDate" TIMESTAMP(3),
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VehicleDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VehicleInsurance" (
  "id" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "policyNumber" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "coverage" TEXT NOT NULL,
  "phoneNumber" TEXT,
  "documentUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VehicleInsurance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VehicleInsurance_vehicleId_key" ON "VehicleInsurance"("vehicleId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MaintenanceRecord_vehicleId_fkey'
  ) THEN
    ALTER TABLE "MaintenanceRecord"
      ADD CONSTRAINT "MaintenanceRecord_vehicleId_fkey"
      FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'VehicleDocument_vehicleId_fkey'
  ) THEN
    ALTER TABLE "VehicleDocument"
      ADD CONSTRAINT "VehicleDocument_vehicleId_fkey"
      FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'VehicleInsurance_vehicleId_fkey'
  ) THEN
    ALTER TABLE "VehicleInsurance"
      ADD CONSTRAINT "VehicleInsurance_vehicleId_fkey"
      FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Reservation_vehicleId_fkey'
  ) THEN
    ALTER TABLE "Reservation"
      ADD CONSTRAINT "Reservation_vehicleId_fkey"
      FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
