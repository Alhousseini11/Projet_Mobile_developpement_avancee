import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../config/logger';
import { buildPublicErrorMessage, resolveHttpErrorStatus } from '../httpErrors';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const status = resolveHttpErrorStatus(err);
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
  res.status(status).json({ message: buildPublicErrorMessage(err) });
}
