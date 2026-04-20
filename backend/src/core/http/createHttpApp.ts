import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { registerRoutes } from '../../modules';
import {
  renderResetPasswordPage,
  submitResetPasswordPage
} from '../../modules/auth/auth.controller';
import { readHealthCheck } from './health';
import { createAuthRateLimit, createCorsOptions } from './security';

export function createHttpApp() {
  const app = express();
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  const authRateLimit = createAuthRateLimit();

  fs.mkdirSync(uploadsDir, { recursive: true });

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(requestLogger);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false
    })
  );
  app.use(cors(createCorsOptions()));
  app.use(express.json({ limit: env.HTTP_JSON_LIMIT }));
  app.use(express.urlencoded({ extended: false, limit: env.HTTP_JSON_LIMIT }));
  app.use('/uploads', express.static(uploadsDir));

  app.use('/api/auth/register', authRateLimit);
  app.use('/api/auth/login', authRateLimit);
  app.use('/api/auth/forgot-password', authRateLimit);
  app.use('/api/auth/reset-password', authRateLimit);

  app.get('/', (_req, res) => {
    res.json({
      ok: true,
      service: 'garage-mechanic-backend'
    });
  });

  app.get('/health', async (_req, res) => {
    const healthCheck = await readHealthCheck();

    if (healthCheck.error) {
      logger.warn(
        {
          err: healthCheck.error,
          requestId: typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined
        },
        'Healthcheck database probe failed'
      );
    }

    res.status(healthCheck.statusCode).json(healthCheck.payload);
  });

  app.get('/reset-password', renderResetPasswordPage);
  app.post('/reset-password', authRateLimit, submitResetPasswordPage);

  registerRoutes(app);

  app.use(errorHandler);

  return app;
}
