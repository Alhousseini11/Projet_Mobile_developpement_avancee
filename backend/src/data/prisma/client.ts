import { requireEnv } from '../../config/env';
import { logger } from '../../config/logger';
import { PrismaClient } from './generatedClient';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = requireEnv('DATABASE_URL');

export const prismaPool = new Pool({ connectionString });
const adapter = new PrismaPg(prismaPool);

export const prisma = new PrismaClient({
  adapter,
  log: [
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' }
  ]
});

prisma.$on('warn', (event) => {
  logger.warn(
    {
      prisma: {
        target: event.target,
        message: event.message
      }
    },
    'Prisma warning'
  );
});

prisma.$on('error', (event) => {
  logger.error(
    {
      prisma: {
        target: event.target,
        message: event.message
      }
    },
    'Prisma client error'
  );
});

export async function probeDatabaseConnection() {
  await prisma.$queryRaw`SELECT 1`;
}

export async function disconnectPrisma() {
  await prisma.$disconnect().catch(() => undefined);
  await prismaPool.end().catch(() => undefined);
}
