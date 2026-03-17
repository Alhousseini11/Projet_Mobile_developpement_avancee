import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../../shared/errors';
import { logger } from '../../../config/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const status = err instanceof AppError ? err.status : 500;
  logger.error(
    {
      method: req.method,
      url: req.url,
      status,
      stack: err.stack
    },
    'http error'
  );
  res.status(status).json({ message: err.message || 'Internal error' });
}
