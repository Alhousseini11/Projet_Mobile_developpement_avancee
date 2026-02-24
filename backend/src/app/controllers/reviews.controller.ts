import { Request, Response } from 'express';
import { prisma } from '../../data/prisma/client';

export const listReviews = async (req: Request, res: Response) => {
  const { reservationId, userId } = req.query;
  const reviews = await prisma.review.findMany({
    where: {
      ...(reservationId ? { reservationId: String(reservationId) } : {}),
      ...(userId ? { userId: String(userId) } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { fullName: true } } },
  });
  res.json(reviews);
};
