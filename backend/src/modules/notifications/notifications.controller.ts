import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../shared/errors';
import { listNotificationsForUser } from './notifications.service';

function getAuthenticatedUserId(res: Response) {
  return String(res.locals.authUser?.id ?? '');
}

export async function listNotifications(_req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getAuthenticatedUserId(res);

    if (!userId) {
      throw new AppError('Authentification requise.', 401);
    }

    res.json(await listNotificationsForUser(userId));
  } catch (error) {
    next(error);
  }
}
