import { Request, Response, NextFunction } from 'express';

export function authGuard(_req: Request, _res: Response, next: NextFunction) {
  // TODO: implement JWT validation
  next();
}
