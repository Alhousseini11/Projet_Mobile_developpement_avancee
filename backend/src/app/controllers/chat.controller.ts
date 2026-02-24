import { Request, Response } from 'express';
import { prisma } from '../../data/prisma/client';

export const listMessages = async (req: Request, res: Response) => {
  const { userId, peerId } = req.query;
  const where =
    userId && peerId
      ? {
          OR: [
            { senderId: String(userId), receiverId: String(peerId) },
            { senderId: String(peerId), receiverId: String(userId) },
          ],
        }
      : {};

  const messages = await prisma.chatMessage.findMany({
    where,
    orderBy: { sentAt: 'desc' },
  });
  res.json(messages);
};
