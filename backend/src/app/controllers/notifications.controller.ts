import { Request, Response } from 'express';
import { prisma } from '../../data/prisma/client';

export const listNotifications = async (req: Request, res: Response) => {
  const { userId } = req.query;
  const notifications = await prisma.notification.findMany({
    where: userId ? { userId: String(userId) } : {},
    orderBy: { sentAt: 'desc' },
  });
  res.json(notifications);
};
