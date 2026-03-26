import { Role } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../../shared/errors';

export function roleGuard(roles: Array<Role | string>) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const authUser = res.locals.authUser;

    if (!authUser) {
      next(new AppError('Authentification requise.', 401));
      return;
    }

    if (!roles.includes(authUser.role)) {
      next(new AppError('Acces refuse.', 403));
      return;
    }

    next();
  };
}
