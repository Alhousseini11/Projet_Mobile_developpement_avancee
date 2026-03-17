import { Request, Response } from 'express';

export function createPlaceholderHandler(feature: string, action: string) {
  return async (_req: Request, res: Response) => {
    res.status(501).json({
      message: `${feature}.${action} not implemented`
    });
  };
}
