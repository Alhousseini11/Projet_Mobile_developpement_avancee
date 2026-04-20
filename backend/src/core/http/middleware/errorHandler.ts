import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../../shared/errors';
import { logger } from '../../../config/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const status = err instanceof AppError ? err.status : 500;
  logger.error(
    {
      err,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: status,
      requestId: typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined,
      userId: typeof res.locals.authUser?.id === 'string' ? res.locals.authUser.id : undefined
    },
    'http error'
  );
  res.status(status).json({ message: err.message || 'Internal error' });
}
