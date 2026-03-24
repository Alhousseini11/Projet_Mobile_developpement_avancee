import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { logger } from '../../config/logger';
import { prisma } from '../../data/prisma/client';
import { isSchemaDriftError } from '../_shared/isSchemaDriftError';
import { isCurrentVehicleSchemaAvailable } from '../_shared/schemaCapabilities';

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

interface VehicleWritePayload {
  name: string;
  model: string;
  year: number;
  mileage: number;
  type: VehicleResponse['type'];
  licensePlate: string | null;
  fuelType: string | null;
  vin: string | null;
  color: string | null;
}

function getAuthenticatedUserId(res: Response) {
  return String(res.locals.authUser?.id ?? '');
}

function normalizeText(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeRequiredText(value: unknown, fallback = 'Vehicule') {
  return normalizeText(value) ?? fallback;
}

function normalizeNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
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

function buildVehicleWritePayload(data: any): VehicleWritePayload {
  return {
    name: normalizeRequiredText(data?.name),
    model: normalizeRequiredText(data?.model, 'Modele'),
    year: normalizeNumber(data?.year, new Date().getFullYear()),
    mileage: normalizeNumber(data?.mileage, 0),
    type: normalizeVehicleType(typeof data?.type === 'string' ? data.type : undefined),
    licensePlate: normalizeText(data?.licensePlate),
    fuelType: normalizeText(data?.fuelType),
    vin: normalizeText(data?.vin),
    color: normalizeText(data?.color)
  };
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
  if (!(await isCurrentVehicleSchemaAvailable())) {
    return readLegacyVehicles(userId);
  }

  try {
    return await readCurrentVehicles(userId);
  } catch (currentSchemaError) {
    if (!isSchemaDriftError(currentSchemaError)) {
      logger.error({ err: currentSchemaError, userId }, 'Unable to read vehicles from current schema');
      return [];
    }

    logger.warn({ err: currentSchemaError, userId }, 'Falling back to legacy vehicle schema');

    try {
      return await readLegacyVehicles(userId);
    } catch (legacySchemaError) {
      logger.error(
        { err: legacySchemaError, userId },
        'Unable to read vehicles from current or legacy schema'
      );
      return [];
    }
  }
}

export async function findVehicleById(userId: string, vehicleId: string) {
  const vehicles = await readVehicleCatalog(userId);
  return vehicles.find(vehicle => vehicle.id === vehicleId) ?? null;
}

async function createCurrentVehicle(userId: string, payload: VehicleWritePayload) {
  const vehicle = await prisma.vehicle.create({
    data: {
      userId,
      name: payload.name,
      model: payload.model,
      year: payload.year,
      mileage: payload.mileage,
      type: payload.type,
      licensePlate: payload.licensePlate,
      fuelType: payload.fuelType,
      vin: payload.vin,
      color: payload.color
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

  return mapCurrentVehicle({
    ...vehicle,
    type: String(vehicle.type)
  });
}

async function createLegacyVehicle(userId: string, payload: VehicleWritePayload) {
  const vehicleId = randomUUID();
  const rows = await prisma.$queryRaw<LegacyVehicleRow[]>`
    INSERT INTO "Vehicle" ("id", "userId", "brand", "model", "year", "mileage")
    VALUES (${vehicleId}, ${userId}, ${payload.name}, ${payload.model}, ${payload.year}, ${payload.mileage})
    RETURNING "id", "userId", "brand", "model", "year", "mileage"
  `;

  const vehicle = rows[0];
  if (!vehicle) {
    throw new Error('Legacy vehicle insert returned no row.');
  }

  return mapLegacyVehicle(vehicle);
}

async function updateCurrentVehicle(vehicleId: string, payload: VehicleWritePayload) {
  const vehicle = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      name: payload.name,
      model: payload.model,
      year: payload.year,
      mileage: payload.mileage,
      type: payload.type,
      licensePlate: payload.licensePlate,
      fuelType: payload.fuelType,
      vin: payload.vin,
      color: payload.color
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

  return mapCurrentVehicle({
    ...vehicle,
    type: String(vehicle.type)
  });
}

async function updateLegacyVehicle(userId: string, vehicleId: string, payload: VehicleWritePayload) {
  const rows = await prisma.$queryRaw<LegacyVehicleRow[]>`
    UPDATE "Vehicle"
    SET
      "brand" = ${payload.name},
      "model" = ${payload.model},
      "year" = ${payload.year},
      "mileage" = ${payload.mileage}
    WHERE "id" = ${vehicleId} AND "userId" = ${userId}
    RETURNING "id", "userId", "brand", "model", "year", "mileage"
  `;

  const vehicle = rows[0];
  if (!vehicle) {
    throw new Error('Legacy vehicle update returned no row.');
  }

  return mapLegacyVehicle(vehicle);
}

async function deleteLegacyVehicle(userId: string, vehicleId: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    DELETE FROM "Vehicle"
    WHERE "id" = ${vehicleId} AND "userId" = ${userId}
    RETURNING "id"
  `;

  return rows.length > 0;
}

export async function listVehicles(_req: Request, res: Response) {
  const userId = getAuthenticatedUserId(res);
  res.json(await readVehicleCatalog(userId));
}

export async function createVehicle(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(res);
  const payload = buildVehicleWritePayload(req.body);

  if (!(await isCurrentVehicleSchemaAvailable())) {
    try {
      res.status(201).json(await createLegacyVehicle(userId, payload));
    } catch (legacySchemaError) {
      logger.error(
        { err: legacySchemaError, userId },
        'Error creating vehicle in legacy schema'
      );
      res.status(503).json({ message: 'Vehicle write operations are not available on this deployment.' });
    }
    return;
  }

  try {
    res.status(201).json(await createCurrentVehicle(userId, payload));
  } catch (currentSchemaError) {
    if (!isSchemaDriftError(currentSchemaError)) {
      logger.error({ err: currentSchemaError, userId }, 'Error creating vehicle in current schema');
      res.status(503).json({ message: 'Vehicle write operations are not available on this deployment.' });
      return;
    }

    logger.warn({ err: currentSchemaError, userId }, 'Falling back to legacy vehicle create');

    try {
      res.status(201).json(await createLegacyVehicle(userId, payload));
    } catch (legacySchemaError) {
      logger.error(
        { err: legacySchemaError, userId },
        'Error creating vehicle in current and legacy schemas'
      );
      res.status(503).json({ message: 'Vehicle write operations are not available on this deployment.' });
    }
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
  const payload = buildVehicleWritePayload(req.body);

  const currentSchemaAvailable = await isCurrentVehicleSchemaAvailable();

  try {
    const existing = await findVehicleById(userId, id);
    if (!existing) {
      res.status(404).json({ message: 'Vehicle not found' });
      return;
    }

    if (!currentSchemaAvailable) {
      res.json(await updateLegacyVehicle(userId, id, payload));
      return;
    }

    res.json(await updateCurrentVehicle(id, payload));
  } catch (currentSchemaError) {
    if (!isSchemaDriftError(currentSchemaError)) {
      logger.error(
        { err: currentSchemaError, userId, vehicleId: id },
        'Error updating vehicle in current schema'
      );
      res.status(503).json({ message: 'Vehicle write operations are not available on this deployment.' });
      return;
    }

    logger.warn(
      { err: currentSchemaError, userId, vehicleId: id },
      'Falling back to legacy vehicle update'
    );

    try {
      res.json(await updateLegacyVehicle(userId, id, payload));
    } catch (legacySchemaError) {
      logger.error(
        { err: legacySchemaError, userId, vehicleId: id },
        'Error updating vehicle in current and legacy schemas'
      );
      res.status(503).json({ message: 'Vehicle write operations are not available on this deployment.' });
    }
  }
}

export async function deleteVehicle(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(res);
  const { id } = req.params;
  const currentSchemaAvailable = await isCurrentVehicleSchemaAvailable();

  try {
    const existing = await findVehicleById(userId, id);
    if (!existing) {
      res.status(404).json({ message: 'Vehicle not found' });
      return;
    }

    if (!currentSchemaAvailable) {
      const deleted = await deleteLegacyVehicle(userId, id);
      if (!deleted) {
        res.status(404).json({ message: 'Vehicle not found' });
        return;
      }
      res.status(204).end();
      return;
    }

    await prisma.vehicle.delete({ where: { id } });
    res.status(204).end();
  } catch (currentSchemaError) {
    if (!isSchemaDriftError(currentSchemaError)) {
      logger.error(
        { err: currentSchemaError, userId, vehicleId: id },
        'Error deleting vehicle in current schema'
      );
      res.status(503).json({ message: 'Vehicle delete is not available on this deployment.' });
      return;
    }

    logger.warn(
      { err: currentSchemaError, userId, vehicleId: id },
      'Falling back to legacy vehicle delete'
    );

    try {
      const deleted = await deleteLegacyVehicle(userId, id);
      if (!deleted) {
        res.status(404).json({ message: 'Vehicle not found' });
        return;
      }
      res.status(204).end();
    } catch (legacySchemaError) {
      logger.error(
        { err: legacySchemaError, userId, vehicleId: id },
        'Error deleting vehicle in current and legacy schemas'
      );
      res.status(503).json({ message: 'Vehicle delete is not available on this deployment.' });
    }
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
    logger.warn({ err: error, userId, vehicleId: id }, 'Maintenance history unavailable');
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
    logger.warn({ err: error, userId, vehicleId: id }, 'Vehicle documents unavailable');
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
    logger.warn({ err: error, userId, vehicleId: id }, 'Vehicle insurance unavailable');
    res.status(404).json({ message: 'Insurance not found' });
  }
}

export const __vehicleControllerInternals = {
  normalizeText,
  normalizeRequiredText,
  normalizeNumber,
  normalizeDate,
  mapCurrentVehicle,
  mapLegacyVehicle,
  normalizeVehicleType,
  buildVehicleWritePayload
};
