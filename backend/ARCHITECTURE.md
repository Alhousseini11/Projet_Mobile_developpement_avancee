# Backend Architecture

## Goal

The backend is organized by feature modules so each domain keeps its routes,
controllers, and contracts together.

## Structure

```text
backend/
|- prisma/
|  |- schema.prisma
|  `- migrations/
`- src/
   |- core/
   |  `- http/
   |     |- createHttpApp.ts
   |     `- middleware/
   |- modules/
   |  |- auth/
   |  |- vehicles/
   |  |- tutorials/
   |  |- reservations/
   |  |- profile/
   |  `- ...
   |- config/
   |- data/
   |- domain/
   |- shared/
   `- server.ts
```

## Rules

- `prisma/schema.prisma` is the persistence source of truth.
- `src/modules/*` contains the HTTP entrypoints for each business domain.
- `src/core/http` contains only shared Express setup and middleware.
- `src/data` contains infrastructure adapters and repository implementations.
- `src/domain` contains business interfaces and abstractions.

## Current state

- `vehicles` and `tutorials` now expose contracts aligned with the frontend.
- The Prisma schema now includes the supporting vehicle sub-resources required by the frontend.
- The HTTP structure is ready for real controller and repository implementation without another folder reshuffle.
