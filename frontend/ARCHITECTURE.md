# Project Architecture

## Goal

This repository is split into a mobile frontend and a modular backend.
The intent is to keep:

- UI code inside the NativeScript app.
- API and persistence logic inside the backend.
- Shared business contracts explicit at the feature level.

## Top-level structure

```text
.
|- app/                  # NativeScript Vue screens, services, types, utils
|- App_Resources/        # NativeScript platform resources
|- backend/              # Express + Prisma backend
|- hooks/                # NativeScript build hooks
|- platforms/            # Generated mobile platforms
|- package.json          # Frontend scripts
|- nativescript.config.ts
|- webpack.config.js
`- tsconfig.json
```

## Frontend structure

```text
app/
|- components/           # Screens and feature UI
|- services/             # Frontend data access and mocks
|- types/                # Canonical frontend contracts
|- utils/                # Navigation and UI helpers
|- AppShell.vue          # Root shell for app-level navigation
`- app.ts                # NativeScript bootstrap
```

### Frontend rules

- `app/types/*` is the source of truth for frontend DTO shapes.
- `app/services/*` must depend on `app/types/*`, not redefine contracts locally.
- `app/components/*` should stay focused on rendering and user interactions.

## Backend structure

```text
backend/
|- prisma/
|  |- schema.prisma      # Persistence source of truth
|  `- migrations/
`- src/
   |- core/
   |  `- http/           # Express app factory and shared middleware
   |- modules/           # Feature modules grouped by domain
   |- config/            # Environment and app configuration
   |- data/              # Infra adapters and repositories
   |- domain/            # Domain interfaces and business abstractions
   |- shared/            # Cross-domain utilities
   `- server.ts          # Backend entrypoint
```

### Backend rules

- `backend/prisma/schema.prisma` defines database reality.
- `backend/src/modules/*` groups routes, controllers, and contracts by feature.
- `backend/src/core/http` contains only cross-cutting HTTP setup.
- `backend/src/data` implements infrastructure details.
- `backend/src/domain` stays independent from Express and Prisma.

## Contract alignment

The current backend schema was updated to match the frontend shape for the main domains:

- `Vehicle` now matches the frontend vehicle contract more closely.
- `Tutorial` now matches the frontend tutorial contract more closely.
- Vehicle-related sub-resources now exist in Prisma: maintenance records, documents, insurance.

## Next implementation step

The structure is now ready for feature-by-feature API implementation:

1. Replace placeholder controllers in `backend/src/modules/*`.
2. Add Prisma repositories for `vehicles`, `tutorials`, `reservations`, and `profile`.
3. Make frontend services call the real backend instead of mocks.
