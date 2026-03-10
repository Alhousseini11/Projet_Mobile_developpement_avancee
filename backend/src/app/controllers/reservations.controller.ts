import { Request, Response } from 'express';
import { prisma } from '../../data/prisma/client';

export const listReservations = async (_req: Request, res: Response) => {
  const reservations = await prisma.reservation.findMany({
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      mechanic: { select: { id: true, fullName: true, email: true } },
      location: true,
      photos: true,
      reviews: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(reservations);
};

export const createReservation = async (req: Request, res: Response) => {
  const { userId, serviceType, scheduledAt, amount, currency = 'USD', description, locationId, mechanicId } = req.body;
  if (!userId || !serviceType || !scheduledAt || !amount) {
    return res.status(400).json({ message: 'userId, serviceType, scheduledAt, amount sont requis' });
  }

  // Validation FK basique pour éviter les erreurs 500 côté Prisma
  const user = await prisma.user.findUnique({ where: { id: String(userId) } });
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
  if (mechanicId) {
    const mech = await prisma.user.findUnique({ where: { id: String(mechanicId) } });
    if (!mech) return res.status(404).json({ message: 'Mécanicien introuvable' });
  }
  if (locationId) {
    const loc = await prisma.location.findUnique({ where: { id: String(locationId) } });
    if (!loc) return res.status(404).json({ message: 'Lieu introuvable' });
  }

  const reservation = await prisma.reservation.create({
    data: {
      userId,
      mechanicId: mechanicId || null,
      serviceType,
      description: description || null,
      scheduledAt: new Date(scheduledAt),
      amount,
      currency,
      locationId: locationId || null,
    },
  });
  res.status(201).json(reservation);
};

export const getReservation = async (req: Request, res: Response) => {
  const { id } = req.params;
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      user: true,
      mechanic: true,
      location: true,
      photos: true,
      reviews: true,
    },
  });
  if (!reservation) return res.status(404).json({ message: 'Réservation introuvable' });
  res.json(reservation);
};

export const updateReservation = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const reservation = await prisma.reservation.update({
      where: { id },
      data: req.body,
    });
    res.json(reservation);
  } catch {
    res.status(404).json({ message: 'Réservation introuvable' });
  }
};

export const addReservationPhoto = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { url } = req.body;
  if (!url) return res.status(400).json({ message: 'url est requis' });
  try {
    const photo = await prisma.reservationPhoto.create({
      data: { reservationId: id, url },
    });
    res.status(201).json(photo);
  } catch {
    res.status(404).json({ message: 'Réservation introuvable' });
  }
};

export const payReservation = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { paymentId, status = 'PAID' } = req.body;
  try {
    const reservation = await prisma.reservation.update({
      where: { id },
      data: { paymentId: paymentId || `pay_${Date.now()}`, status },
    });
    res.json(reservation);
  } catch {
    res.status(404).json({ message: 'Réservation introuvable' });
  }
};
