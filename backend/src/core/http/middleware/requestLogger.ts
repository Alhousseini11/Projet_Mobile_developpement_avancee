import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../config/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = process.hrtime.bigint();

  res.once('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const userId = res.locals.authUser?.id;
    const level =
      res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level](
      {
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(1)),
        userId: typeof userId === 'string' ? userId : undefined
      },
      'http response'
    );
  });

  next();
}
