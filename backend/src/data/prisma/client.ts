import '../../config/env';
import { PrismaClient } from './generatedClient';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://mon_user:Al98970071@localhost:5432/mon_app?schema=public';

export const prismaPool = new Pool({ connectionString });
const adapter = new PrismaPg(prismaPool);

export const prisma = new PrismaClient({
  adapter,
});

export async function disconnectPrisma() {
  await prisma.$disconnect().catch(() => undefined);
  await prismaPool.end().catch(() => undefined);
}
