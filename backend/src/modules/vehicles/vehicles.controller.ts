import { Request, Response } from 'express';
import { prisma } from '../../data/prisma/client';

interface VehicleResponse {
  id: string;
  userId: string;
  name: string;
  model: string;
  year: number;
  mileage: number;
  type: 'sedan' | 'suv' | 'truck' | 'minivan' | 'coupe' | 'other';
  licensePlate: string | null;
  fuelType: string | null;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LegacyVehicleRow {
  id: string;
  userId: string;
  brand: string;
  model: string;
  year: number;
  mileage: number | null;
}

function getAuthenticatedUserId(res: Response) {
  return String(res.locals.authUser?.id ?? '');
}

function normalizeDate(value?: Date | string | null) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

function mapCurrentVehicle(vehicle: {
  id: string;
  userId: string;
  name: string;
  model: string;
  year: number;
  mileage: number;
  type: string;
  licensePlate: string | null;
  fuelType: string | null;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}): VehicleResponse {
  return {
    id: vehicle.id,
    userId: vehicle.userId,
    name: vehicle.name,
    model: vehicle.model,
    year: vehicle.year,
    mileage: Number(vehicle.mileage ?? 0),
    type: normalizeVehicleType(vehicle.type),
    licensePlate: vehicle.licensePlate,
    fuelType: vehicle.fuelType,
    color: vehicle.color,
    createdAt: vehicle.createdAt,
    updatedAt: vehicle.updatedAt
  };
}

function mapLegacyVehicle(vehicle: LegacyVehicleRow): VehicleResponse {
  const timestamp = new Date();

  return {
    id: vehicle.id,
    userId: vehicle.userId,
    name: vehicle.brand,
    model: vehicle.model,
    year: Number(vehicle.year),
    mileage: Number(vehicle.mileage ?? 0),
    type: 'sedan',
    licensePlate: null,
    fuelType: null,
    color: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function normalizeVehicleType(value: string | null | undefined): VehicleResponse['type'] {
  switch (value?.toLowerCase()) {
    case 'suv':
      return 'suv';
    case 'truck':
      return 'truck';
    case 'minivan':
      return 'minivan';
    case 'coupe':
      return 'coupe';
    case 'other':
      return 'other';
    case 'sedan':
    default:
      return 'sedan';
  }
}

async function readCurrentVehicles(userId: string) {
  const vehicles = await prisma.vehicle.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      userId: true,
      name: true,
      model: true,
      year: true,
      mileage: true,
      type: true,
      licensePlate: true,
      fuelType: true,
      color: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return vehicles.map(vehicle => mapCurrentVehicle({
    ...vehicle,
    type: String(vehicle.type)
  }));
}

async function readLegacyVehicles(userId: string) {
  const vehicles = await prisma.$queryRaw<LegacyVehicleRow[]>`
    SELECT "id", "userId", "brand", "model", "year", "mileage"
    FROM "Vehicle"
    WHERE "userId" = ${userId}
    ORDER BY "id" DESC
  `;

  return vehicles.map(mapLegacyVehicle);
}

async function readVehicleCatalog(userId: string) {
  try {
    return await readCurrentVehicles(userId);
  } catch (currentSchemaError) {
    console.warn('Falling back to legacy vehicle schema:', currentSchemaError);

    try {
      return await readLegacyVehicles(userId);
    } catch (legacySchemaError) {
      console.error('Unable to read vehicles from current or legacy schema:', legacySchemaError);
      return [];
    }
  }
}

async function findVehicleById(userId: string, vehicleId: string) {
  const vehicles = await readVehicleCatalog(userId);
  return vehicles.find(vehicle => vehicle.id === vehicleId) ?? null;
}

export async function listVehicles(_req: Request, res: Response) {
  const userId = getAuthenticatedUserId(res);
  res.json(await readVehicleCatalog(userId));
}

export async function createVehicle(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(res);
  const data = req.body;

  try {
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
      },
      select: {
        id: true,
        userId: true,
        name: true,
        model: true,
        year: true,
        mileage: true,
        type: true,
        licensePlate: true,
        fuelType: true,
        color: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json(mapCurrentVehicle({
      ...vehicle,
      type: String(vehicle.type)
    }));
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(503).json({ message: 'Vehicle write operations are not available on this deployment.' });
  }
}

export async function getVehicleById(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(res);
  const { id } = req.params;
  const vehicle = await findVehicleById(userId, id);

  if (!vehicle) {
    res.status(404).json({ message: 'Vehicle not found' });
    return;
  }

  res.json(vehicle);
}

export async function updateVehicle(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(res);
  const { id } = req.params;
  const data = req.body;

  try {
    const existing = await findVehicleById(userId, id);
    if (!existing) {
      res.status(404).json({ message: 'Vehicle not found' });
      return;
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
      },
      select: {
        id: true,
        userId: true,
        name: true,
        model: true,
        year: true,
        mileage: true,
        type: true,
        licensePlate: true,
        fuelType: true,
        color: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(mapCurrentVehicle({
      ...vehicle,
      type: String(vehicle.type)
    }));
  } catch (error) {
    console.error(`Error updating vehicle ${id}:`, error);
    res.status(503).json({ message: 'Vehicle write operations are not available on this deployment.' });
  }
}

export async function deleteVehicle(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(res);
  const { id } = req.params;

  try {
    const existing = await findVehicleById(userId, id);
    if (!existing) {
      res.status(404).json({ message: 'Vehicle not found' });
      return;
    }

    await prisma.vehicle.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    console.error(`Error deleting vehicle ${id}:`, error);
    res.status(503).json({ message: 'Vehicle delete is not available on this deployment.' });
  }
}

export async function getMaintenanceHistory(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(res);
  const { id } = req.params;

  try {
    const vehicle = await findVehicleById(userId, id);
    if (!vehicle) {
      res.status(404).json({ message: 'Vehicle not found' });
      return;
    }

    const records = await prisma.maintenanceRecord.findMany({
      where: { vehicleId: id },
      orderBy: { date: 'desc' }
    });

    res.json(records);
  } catch (error) {
    console.warn(`Maintenance history unavailable for vehicle ${id}:`, error);
    res.json([]);
  }
}

export async function getVehicleDocuments(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(res);
  const { id } = req.params;

  try {
    const vehicle = await findVehicleById(userId, id);
    if (!vehicle) {
      res.status(404).json({ message: 'Vehicle not found' });
      return;
    }

    const documents = await prisma.vehicleDocument.findMany({
      where: { vehicleId: id },
      orderBy: { uploadedAt: 'desc' }
    });

    res.json(documents);
  } catch (error) {
    console.warn(`Vehicle documents unavailable for vehicle ${id}:`, error);
    res.json([]);
  }
}

export async function getVehicleInsurance(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(res);
  const { id } = req.params;

  try {
    const vehicle = await findVehicleById(userId, id);
    if (!vehicle) {
      res.status(404).json({ message: 'Vehicle not found' });
      return;
    }

    const insurance = await prisma.vehicleInsurance.findUnique({
      where: { vehicleId: id }
    });

    if (!insurance) {
      res.status(404).json({ message: 'Insurance not found' });
      return;
    }

    res.json({
      ...insurance,
      startDate: normalizeDate(insurance.startDate),
      endDate: normalizeDate(insurance.endDate)
    });
  } catch (error) {
    console.warn(`Vehicle insurance unavailable for vehicle ${id}:`, error);
    res.status(404).json({ message: 'Insurance not found' });
  }
}
