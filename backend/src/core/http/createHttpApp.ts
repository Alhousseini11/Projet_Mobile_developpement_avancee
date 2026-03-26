import cors from 'cors';
import express from 'express';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { registerRoutes } from '../../modules';
import {
  renderResetPasswordPage,
  submitResetPasswordPage
} from '../../modules/auth/auth.controller';

export function createHttpApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(requestLogger);

  app.get('/', (_req, res) => {
    res.json({
      ok: true,
      service: 'garage-mechanic-backend'
    });
  });

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'garage-mechanic-backend'
    });
  });

  app.get('/reset-password', renderResetPasswordPage);
  app.post('/reset-password', submitResetPasswordPage);

  registerRoutes(app);

  app.use(errorHandler);

  return app;
}
