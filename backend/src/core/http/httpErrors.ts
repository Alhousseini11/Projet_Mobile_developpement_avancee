import { env } from '../../config/env';
import { AppError } from '../../shared/errors';

function normalizeStatusCandidate(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 400 && value <= 599
    ? value
    : null;
}

export function resolveHttpErrorStatus(error: unknown) {
  if (error instanceof AppError) {
    return error.status;
  }

  const status = normalizeStatusCandidate((error as { status?: unknown } | null)?.status);
  if (status) {
    return status;
  }

  const statusCode = normalizeStatusCandidate((error as { statusCode?: unknown } | null)?.statusCode);
  if (statusCode) {
    return statusCode;
  }

  return 500;
}

export function buildPublicErrorMessage(
  error: unknown,
  runtimeEnvironment: string = env.NODE_ENV
) {
  if (error instanceof AppError) {
    return error.message;
  }

  if (runtimeEnvironment !== 'production' && error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Internal error';
}
