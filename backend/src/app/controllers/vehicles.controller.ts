import { Request, Response } from 'express';
import { prisma } from '../../data/prisma/client';

export const listVehicles = async (_req: Request, res: Response) => {
  const vehicles = await prisma.vehicle.findMany({
    include: { reminders: true, user: { select: { id: true, fullName: true, email: true } } },
    orderBy: { brand: 'asc' },
  });
  res.json(vehicles);
};

export const createVehicle = async (req: Request, res: Response) => {
  const { userId, brand, model, year, mileage } = req.body;
  if (!userId || !brand || !model || !year) {
    return res.status(400).json({ message: 'userId, brand, model et year sont requis' });
  }

  // Vérifie que l'utilisateur existe pour éviter une erreur FK
  const user = await prisma.user.findUnique({ where: { id: String(userId) } });
  if (!user) {
    return res.status(404).json({ message: 'Utilisateur inexistant pour ce userId' });
  }

  const vehicle = await prisma.vehicle.create({
    data: { userId, brand, model, year: Number(year), mileage: mileage ? Number(mileage) : null },
  });
  res.status(201).json(vehicle);
};

export const getVehicle = async (req: Request, res: Response) => {
  const { id } = req.params;
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: { reminders: true, user: { select: { id: true, fullName: true, email: true } } },
  });
  if (!vehicle) return res.status(404).json({ message: 'Véhicule introuvable' });
  res.json(vehicle);
};

export const updateVehicle = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: { ...req.body },
    });
    res.json(vehicle);
  } catch {
    res.status(404).json({ message: 'Véhicule introuvable' });
  }
};
