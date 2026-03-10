import { Request, Response } from 'express';
import { prisma } from '../../data/prisma/client';

export const listLocations = async (_req: Request, res: Response) => {
  const locations = await prisma.location.findMany({ orderBy: { address: 'asc' } });
  res.json(locations);
};
