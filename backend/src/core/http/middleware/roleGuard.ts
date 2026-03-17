import { NextFunction, Request, Response } from 'express';

export function roleGuard(_roles: string[]) {
  return (_req: Request, _res: Response, next: NextFunction) => {
    next();
  };
}
