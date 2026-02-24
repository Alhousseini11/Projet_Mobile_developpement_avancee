import { Request, Response } from 'express';

export const emergencyContacts = async (_req: Request, res: Response) => {
  res.json({
    hotline: '+1-800-EMERGENCY',
    towService: '+1-800-TOW-TRUCK',
    message: 'Contacts statiques à personnaliser',
  });
};
