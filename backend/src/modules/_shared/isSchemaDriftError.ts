import { Prisma } from '@prisma/client';

export function isSchemaDriftError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022';
}
