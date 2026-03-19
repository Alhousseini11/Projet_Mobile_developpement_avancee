import cors from 'cors';
import express from 'express';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { registerRoutes } from '../../modules';

export function createHttpApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
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

  registerRoutes(app);

  app.use(errorHandler);

  return app;
}
