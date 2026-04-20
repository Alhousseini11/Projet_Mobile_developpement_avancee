import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { logger } from '../../config/logger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { registerRoutes } from '../../modules';
import {
  renderResetPasswordPage,
  submitResetPasswordPage
} from '../../modules/auth/auth.controller';
import { readHealthCheck } from './health';

export function createHttpApp() {
  const app = express();
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use('/uploads', express.static(uploadsDir));
  app.use(requestLogger);

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
  app.post('/reset-password', submitResetPasswordPage);

  registerRoutes(app);

  app.use(errorHandler);

  return app;
}
