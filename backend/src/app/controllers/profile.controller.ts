import { Request, Response } from 'express';
import { prisma } from '../../data/prisma/client';

export const getProfile = async (req: Request, res: Response) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ message: 'userId requis' });

  const user = await prisma.user.findUnique({
    where: { id: String(userId) },
    include: {
      vehicles: true,
      reservations: true,
      reviews: true,
      notifications: true,
    },
  });
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
  res.json(user);
};
