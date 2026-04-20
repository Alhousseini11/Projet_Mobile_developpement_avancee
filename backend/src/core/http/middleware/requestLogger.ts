import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../config/logger';

function readResponseBytes(res: Response) {
  const contentLength = res.getHeader('content-length');

  if (typeof contentLength === 'number') {
    return contentLength;
  }

  if (typeof contentLength === 'string') {
    const parsedValue = Number(contentLength);
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  }

  return undefined;
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = process.hrtime.bigint();
  const forwardedRequestId = req.get('x-request-id')?.trim();
  const requestId = forwardedRequestId || randomUUID();

  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);

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
        requestId,
        durationMs: Number(durationMs.toFixed(1)),
        ip: req.ip,
        userAgent: req.get('user-agent') || undefined,
        responseBytes: readResponseBytes(res),
        userId: typeof userId === 'string' ? userId : undefined
      },
      'http response'
    );
  });

  next();
}
