CREATE TABLE "ReservationService" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "slotTimes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationService_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReservationService_slug_key" ON "ReservationService"("slug");

INSERT INTO "ReservationService" (
    "id",
    "slug",
    "label",
    "description",
    "durationMinutes",
    "price",
    "slotTimes",
    "active",
    "createdAt",
    "updatedAt"
)
VALUES
    (
        'service-oil-change',
        'oil-change',
        'Vidange',
        'Entretien regulier avec remplacement huile et filtre.',
        45,
        79.00,
        ARRAY['08:30', '10:00', '13:30', '15:00']::TEXT[],
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'service-brakes',
        'brakes',
        'Freins',
        'Inspection et entretien des freins.',
        90,
        149.00,
        ARRAY['09:00', '11:30', '14:00', '16:30']::TEXT[],
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'service-battery',
        'battery',
        'Batterie',
        'Controle ou remplacement de batterie.',
        30,
        99.00,
        ARRAY['08:00', '10:30', '13:00', '17:00']::TEXT[],
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'service-diagnostic',
        'diagnostic',
        'Diagnostic',
        'Lecture des codes et diagnostic general.',
        60,
        59.00,
        ARRAY['09:30', '12:00', '15:30', '18:00']::TEXT[],
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT ("slug") DO UPDATE SET
    "label" = EXCLUDED."label",
    "description" = EXCLUDED."description",
    "durationMinutes" = EXCLUDED."durationMinutes",
    "price" = EXCLUDED."price",
    "slotTimes" = EXCLUDED."slotTimes",
    "active" = EXCLUDED."active",
    "updatedAt" = CURRENT_TIMESTAMP;
