import { Request, Response } from 'express';
import { prisma } from '../../data/prisma/client';

export const getHomeSummary = async (_req: Request, res: Response) => {
  const [users, vehicles, reservations] = await Promise.all([
    prisma.user.count(),
    prisma.vehicle.count(),
    prisma.reservation.count(),
  ]);

  const latestReservations = await prisma.reservation.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { user: { select: { fullName: true } }, location: true },
  });

  res.json({
    stats: {
      users,
      vehicles,
      reservations,
    },
    latestReservations,
    serverTime: new Date().toISOString(),
  });
};
