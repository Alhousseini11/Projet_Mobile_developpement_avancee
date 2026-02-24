import { Request, Response, NextFunction } from 'express';

export function roleGuard(_roles: string[]) {
  return (_req: Request, _res: Response, next: NextFunction) => {
    // TODO: implement role check
    next();
  };
}
