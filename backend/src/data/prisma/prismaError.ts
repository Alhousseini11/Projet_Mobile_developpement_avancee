import { Prisma } from './generatedClient';

type PrismaErrorKind =
  | 'known_request'
  | 'validation'
  | 'initialization'
  | 'rust_panic'
  | 'unknown_request';

interface PrismaErrorDescriptionBase {
  kind: PrismaErrorKind;
  name: string;
  clientVersion?: string;
  message: string;
}

export interface PrismaKnownRequestErrorDescription extends PrismaErrorDescriptionBase {
  kind: 'known_request';
  code: string;
  meta?: Record<string, unknown>;
}

export interface PrismaValidationErrorDescription extends PrismaErrorDescriptionBase {
  kind: 'validation';
}

export interface PrismaInitializationErrorDescription extends PrismaErrorDescriptionBase {
  kind: 'initialization';
  errorCode?: string;
}

export interface PrismaRustPanicErrorDescription extends PrismaErrorDescriptionBase {
  kind: 'rust_panic';
}

export interface PrismaUnknownRequestErrorDescription extends PrismaErrorDescriptionBase {
  kind: 'unknown_request';
}

export type PrismaErrorDescription =
  | PrismaKnownRequestErrorDescription
  | PrismaValidationErrorDescription
  | PrismaInitializationErrorDescription
  | PrismaRustPanicErrorDescription
  | PrismaUnknownRequestErrorDescription;

function normalizePrismaMeta(meta: unknown) {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return undefined;
  }

  return meta as Record<string, unknown>;
}

export function describePrismaError(error: unknown): PrismaErrorDescription | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return {
      kind: 'known_request',
      name: error.name,
      message: error.message,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: normalizePrismaMeta(error.meta)
    };
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      kind: 'validation',
      name: error.name,
      message: error.message
    };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      kind: 'initialization',
      name: error.name,
      message: error.message,
      clientVersion: error.clientVersion,
      errorCode: error.errorCode
    };
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return {
      kind: 'rust_panic',
      name: error.name,
      message: error.message,
      clientVersion: error.clientVersion
    };
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return {
      kind: 'unknown_request',
      name: error.name,
      message: error.message,
      clientVersion: error.clientVersion
    };
  }

  return null;
}
