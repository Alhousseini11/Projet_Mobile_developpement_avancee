import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { CorsOptions } from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';

interface CorsSecurityConfig {
  allowedOrigins: string[];
  nodeEnv: string;
}

function normalizeOrigin(origin: string) {
  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
}

export function isCorsOriginAllowed(
  origin: string | undefined,
  config: CorsSecurityConfig
) {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return false;
  }

  if (config.allowedOrigins.includes(normalizedOrigin)) {
    return true;
  }

  return config.nodeEnv !== 'production' && config.allowedOrigins.length === 0;
}

export function createCorsOptions(): CorsOptions {
  return {
    origin(origin, callback) {
      callback(
        null,
        isCorsOriginAllowed(origin, {
          allowedOrigins: env.CORS_ALLOWED_ORIGINS,
          nodeEnv: env.NODE_ENV
        })
      );
    },
    optionsSuccessStatus: 204
  };
}

function passthroughMiddleware(): RequestHandler {
  return (_req: Request, _res: Response, next: NextFunction) => next();
}

export function createAuthRateLimit(): RequestHandler {
  if (!env.AUTH_RATE_LIMIT_ENABLED) {
    return passthroughMiddleware();
  }

  return rateLimit({
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
    limit: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
    legacyHeaders: false,
    standardHeaders: true,
    message: {
      message: 'Too many authentication attempts. Please retry later.'
    }
  });
}
