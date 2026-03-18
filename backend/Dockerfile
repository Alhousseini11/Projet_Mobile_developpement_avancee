FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
ARG DATABASE_URL=postgresql://mon_user:Al98970071@postgres:5432/mon_app?schema=public
ENV DATABASE_URL=$DATABASE_URL
COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ARG DATABASE_URL=postgresql://mon_user:Al98970071@postgres:5432/mon_app?schema=public
ENV DATABASE_URL=$DATABASE_URL

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY package.json package-lock.json ./

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
