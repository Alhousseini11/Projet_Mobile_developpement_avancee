import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../shared/errors';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  const status = err instanceof AppError ? err.status : 500;
  res.status(status).json({ message: err.message || 'Internal error' });
}
