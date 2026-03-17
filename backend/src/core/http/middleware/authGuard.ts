import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../../shared/errors';
import { extractBearerToken, resolveUserFromAccessToken } from '../../../modules/auth/auth.service';

export async function authGuard(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      throw new AppError('Authentification requise.', 401);
    }

    res.locals.authUser = await resolveUserFromAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
}
