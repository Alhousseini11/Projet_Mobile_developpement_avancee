import type { Request, Response } from 'express';
import { logger } from '../../config/logger';
import { resolveOptionalRequestUser } from '../auth/auth.service';
import { homeService } from './home.service';

export async function getHomeFeed(req: Request, res: Response) {
  try {
    const authenticatedUser = await resolveOptionalRequestUser(req);
    res.json(await homeService.getHomeFeed(authenticatedUser));
  } catch (error) {
    logger.error({ err: error }, 'Error resolving home feed request context');
    res.json(await homeService.getHomeFeed(null));
  }
}
