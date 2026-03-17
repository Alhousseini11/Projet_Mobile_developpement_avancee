import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../config/logger';

export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  logger.info({ method: req.method, url: req.url }, 'http request');
  next();
}
