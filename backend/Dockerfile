FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public
COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY scripts ./scripts
COPY package.json package-lock.json ./

EXPOSE 3000

CMD ["sh", "-c", "if [ -z \"$DATABASE_URL\" ]; then echo >&2 \"DATABASE_URL must be provided at runtime\"; exit 1; fi; npx prisma migrate deploy && node dist/server.js"]
