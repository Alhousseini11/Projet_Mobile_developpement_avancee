import pino from 'pino';
import { describePrismaError } from '../data/prisma/prismaError';

function serializeLoggedError(error: unknown) {
  if (error instanceof Error) {
    const serializedError = pino.stdSerializers.err(error) as Record<string, unknown>;
    const prisma = describePrismaError(error);

    if (prisma) {
      return {
        ...serializedError,
        prisma
      };
    }

    return serializedError;
  }

  const prisma = describePrismaError(error);
  if (prisma) {
    return prisma;
  }

  return {
    value: String(error)
  };
}

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: 'garage-mechanic-backend'
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    err: serializeLoggedError
  }
});
