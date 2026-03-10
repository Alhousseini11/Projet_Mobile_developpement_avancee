import { Request, Response } from 'express';
import { prisma } from '../../data/prisma/client';

export const listTutorials = async (_req: Request, res: Response) => {
  const tutorials = await prisma.tutorial.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json(tutorials);
};
