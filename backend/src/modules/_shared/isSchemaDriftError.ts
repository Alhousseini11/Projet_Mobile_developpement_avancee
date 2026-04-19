import { Prisma } from '../../data/prisma/generatedClient';

export function isSchemaDriftError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  return error.code === 'P2022';
}
