import { Request, Response } from 'express';
import { prisma } from '../../data/prisma/client';

function getAuthenticatedUserId(res: Response) {
  return String(res.locals.authUser?.id ?? '');
}

async function findOwnedVehicle(userId: string, vehicleId: string) {
  return prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      userId
    },
    include: { insurance: true }
  });
}

export async function listVehicles(_req: Request, res: Response) {
  const userId = getAuthenticatedUserId(res);
  const vehicles = await prisma.vehicle.findMany({
    where: { userId },
    include: { insurance: true }
  });
  res.json(vehicles);
}

export async function createVehicle(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(res);
  const data = req.body;
  const vehicle = await prisma.vehicle.create({
    data: {
      userId,
      name: data.name,
      model: data.model,
      year: data.year,
      mileage: data.mileage,
      type: data.type,
      licensePlate: data.licensePlate ?? null,
      fuelType: data.fuelType ?? null,
      vin: data.vin ?? null,
      color: data.color ?? null
    }
  });
  res.status(201).json(vehicle);
}

export async function getVehicleById(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(res);
  const { id } = req.params;
  const vehicle = await findOwnedVehicle(userId, id);
  if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
  res.json(vehicle);
}

export async function updateVehicle(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(res);
  const { id } = req.params;
  const data = req.body;
  try {
    const existing = await findOwnedVehicle(userId, id);
    if (!existing) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        name: data.name,
        model: data.model,
        year: data.year,
        mileage: data.mileage,
        type: data.type,
        licensePlate: data.licensePlate ?? null,
        fuelType: data.fuelType ?? null,
        vin: data.vin ?? null,
        color: data.color ?? null
      }
    });
    res.json(vehicle);
  } catch (err) {
    res.status(404).json({ message: 'Vehicle not found' });
  }
}

export async function deleteVehicle(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(res);
  const { id } = req.params;
  try {
    const existing = await findOwnedVehicle(userId, id);
    if (!existing) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    await prisma.vehicle.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    res.status(404).json({ message: 'Vehicle not found' });
  }
}

export async function getMaintenanceHistory(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(res);
  const { id } = req.params;
  const vehicle = await findOwnedVehicle(userId, id);
  if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
  const records = await prisma.maintenanceRecord.findMany({
    where: { vehicleId: id },
    orderBy: { date: 'desc' }
  });
  res.json(records);
}

export async function getVehicleDocuments(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(res);
  const { id } = req.params;
  const vehicle = await findOwnedVehicle(userId, id);
  if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
  const documents = await prisma.vehicleDocument.findMany({
    where: { vehicleId: id },
    orderBy: { uploadedAt: 'desc' }
  });
  res.json(documents);
}

export async function getVehicleInsurance(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(res);
  const { id } = req.params;
  const vehicle = await findOwnedVehicle(userId, id);
  if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
  const insurance = await prisma.vehicleInsurance.findUnique({
    where: { vehicleId: id }
  });
  if (!insurance) return res.status(404).json({ message: 'Insurance not found' });
  res.json(insurance);
}
