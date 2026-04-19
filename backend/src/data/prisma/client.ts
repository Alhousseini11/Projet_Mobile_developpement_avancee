import { requireEnv } from '../../config/env';
import { PrismaClient } from './generatedClient';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = requireEnv('DATABASE_URL');

export const prismaPool = new Pool({ connectionString });
const adapter = new PrismaPg(prismaPool);

export const prisma = new PrismaClient({
  adapter,
});

export async function disconnectPrisma() {
  await prisma.$disconnect().catch(() => undefined);
  await prismaPool.end().catch(() => undefined);
}
