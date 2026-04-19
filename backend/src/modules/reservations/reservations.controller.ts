import { Prisma, ReservationStatus as PrismaReservationStatus } from '../../data/prisma/generatedClient';
import { Request, Response } from 'express';
import { isDemoUserEmail, normalizeEmail } from '../../config/demo';
import { prisma } from '../../data/prisma/client';
import { createPlaceholderHandler } from '../_shared/createPlaceholderHandler';
import { isReservationVehicleLinkAvailable } from '../_shared/schemaCapabilities';
import { findVehicleById } from '../vehicles/vehicles.controller';
import {
  calculateReservationPricingFromSubtotal,
  getReservationServiceLabel,
  type ReservationServiceOption
} from './reservationCatalog';
import {
  findReservationServiceRecord,
  getReservationServiceLabelMap,
  listReservationServiceCatalog
} from './reservationServices.store';

type ReservationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

interface ReservationRecord {
  id: string;
  userId: string;
  serviceId: string;
  serviceLabel: string;
  vehicleId?: string;
  vehicleLabel?: string;
  date: string;
  time: string;
  status: ReservationStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ReservationVehicleSnapshot {
  name: string;
  model: string;
}

interface ReservationQueryRecord {
  id: string;
  userId: string;
  serviceType: string;
  description: string | null;
  status: PrismaReservationStatus;
  scheduledAt: Date;
  createdAt: Date;
  updatedAt: Date;
  vehicleId: string | null;
  vehicle: ReservationVehicleSnapshot | null;
}

type ReservationSerializableInput = Omit<ReservationQueryRecord, 'vehicleId' | 'vehicle'> & {
  vehicleId?: string | null;
  vehicle?: ReservationVehicleSnapshot | null;
};

const DEMO_RESERVATION_SEED = [
  {
    idSuffix: 'reservation-1',
    serviceId: 'oil-change',
    scheduledAt: new Date('2026-03-18T10:00:00Z'),
    status: PrismaReservationStatus.CONFIRMED,
    createdAt: new Date('2026-03-10T09:00:00Z'),
    updatedAt: new Date('2026-03-10T09:00:00Z'),
    amount: new Prisma.Decimal('90.86')
  },
  {
    idSuffix: 'reservation-2',
    serviceId: 'diagnostic',
    scheduledAt: new Date('2026-03-22T15:30:00Z'),
    status: PrismaReservationStatus.PENDING,
    createdAt: new Date('2026-03-12T14:15:00Z'),
    updatedAt: new Date('2026-03-12T14:15:00Z'),
    amount: new Prisma.Decimal('67.84')
  }
] as const;

function getAuthenticatedUser(res: Response) {
  return {
    userId: String(res.locals.authUser?.id ?? ''),
    email: normalizeEmail(res.locals.authUser?.email)
  };
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toTimeLabel(date: Date) {
  return date.toISOString().slice(11, 16);
}

function toPrismaStatus(status: string | undefined): PrismaReservationStatus | null {
  switch (status) {
    case 'pending':
      return PrismaReservationStatus.PENDING;
    case 'confirmed':
      return PrismaReservationStatus.CONFIRMED;
    case 'completed':
      return PrismaReservationStatus.COMPLETED;
    case 'cancelled':
      return PrismaReservationStatus.CANCELLED;
    default:
      return null;
  }
}

function fromPrismaStatus(status: PrismaReservationStatus): ReservationStatus {
  switch (status) {
    case PrismaReservationStatus.CONFIRMED:
    case PrismaReservationStatus.PAID:
      return 'confirmed';
    case PrismaReservationStatus.COMPLETED:
      return 'completed';
    case PrismaReservationStatus.CANCELLED:
      return 'cancelled';
    case PrismaReservationStatus.PENDING:
    default:
      return 'pending';
  }
}

function buildScheduledAt(date: string, time: string) {
  return new Date(`${date}T${time}:00.000Z`);
}

function formatReservationVehicleLabel(vehicle: ReservationVehicleSnapshot | null) {
  if (!vehicle) {
    return undefined;
  }

  const name = vehicle.name.trim();
  const model = vehicle.model.trim();

  if (!name) {
    return model || undefined;
  }

  if (!model || model.toLowerCase() === name.toLowerCase()) {
    return name;
  }

  return `${name} ${model}`;
}

function toReservationQueryRecord(reservation: ReservationSerializableInput) {
  return {
    ...reservation,
    vehicleId: reservation.vehicleId ?? null,
    vehicle: reservation.vehicle ?? null
  } satisfies ReservationQueryRecord;
}

function serializeReservation(
  reservation: ReservationQueryRecord,
  serviceLabelMap?: Map<string, string>
) {
  return {
    id: reservation.id,
    serviceId: reservation.serviceType,
    serviceLabel:
      serviceLabelMap?.get(reservation.serviceType) ??
      getReservationServiceLabel(reservation.serviceType),
    vehicleId: reservation.vehicleId ?? undefined,
    vehicleLabel: formatReservationVehicleLabel(reservation.vehicle),
    date: toIsoDate(reservation.scheduledAt),
    time: toTimeLabel(reservation.scheduledAt),
    status: fromPrismaStatus(reservation.status),
    notes: reservation.description ?? undefined,
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString()
  };
}

async function readReservationRowsForUser(userId: string, email?: string | null) {
  if (!userId) {
    return [] as ReservationQueryRecord[];
  }

  await ensureDemoReservations(userId, email);

  const baseSelect = {
    id: true,
    userId: true,
    serviceType: true,
    description: true,
    status: true,
    scheduledAt: true,
    createdAt: true,
    updatedAt: true
  } as const;

  if (!(await isReservationVehicleLinkAvailable())) {
    const reservations = await prisma.reservation.findMany({
      where: { userId },
      orderBy: { scheduledAt: 'asc' },
      select: baseSelect
    });

    return reservations.map(reservation => ({
      ...reservation,
      vehicleId: null,
      vehicle: null
    }));
  }

  return prisma.reservation.findMany({
    where: { userId },
    orderBy: { scheduledAt: 'asc' },
    select: {
      ...baseSelect,
      vehicleId: true,
      vehicle: {
        select: {
          name: true,
          model: true
        }
      }
    }
  });
}

async function findReservationRowForUser(userId: string, reservationId: string, email?: string | null) {
  if (!userId) {
    return null;
  }

  await ensureDemoReservations(userId, email);

  const baseSelect = {
    id: true,
    userId: true,
    serviceType: true,
    description: true,
    status: true,
    scheduledAt: true,
    createdAt: true,
    updatedAt: true
  } as const;

  if (!(await isReservationVehicleLinkAvailable())) {
    const reservation = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
        userId
      },
      select: baseSelect
    });

    if (!reservation) {
      return null;
    }

    return {
      ...reservation,
      vehicleId: null,
      vehicle: null
    } satisfies ReservationQueryRecord;
  }

  return prisma.reservation.findFirst({
    where: {
      id: reservationId,
      userId
    },
    select: {
      ...baseSelect,
      vehicleId: true,
      vehicle: {
        select: {
          name: true,
          model: true
        }
      }
    }
  });
}

async function ensureDemoReservations(userId: string, email?: string | null) {
  if (!userId || !isDemoUserEmail(email)) {
    return;
  }

  for (const reservation of DEMO_RESERVATION_SEED) {
    await prisma.reservation.upsert({
      where: { id: `${userId}-${reservation.idSuffix}` },
      update: {},
      create: {
        id: `${userId}-${reservation.idSuffix}`,
        userId,
        serviceType: reservation.serviceId,
        description: null,
        status: reservation.status,
        scheduledAt: reservation.scheduledAt,
        amount: reservation.amount,
        currency: 'CAD',
        createdAt: reservation.createdAt,
        updatedAt: reservation.updatedAt
      }
    });
  }
}

async function readReservationsForUser(userId: string, email?: string | null) {
  return readReservationRowsForUser(userId, email);
}

export async function listReservationsForUser(userId: string, email?: string | null) {
  const reservations = await readReservationsForUser(userId, email);
  const serviceLabelMap = await getReservationServiceLabelMap(
    reservations.map(reservation => reservation.serviceType)
  );
  return reservations.map(item => {
    const serialized = serializeReservation(item, serviceLabelMap);
    return {
      id: serialized.id,
      userId,
      serviceId: serialized.serviceId,
      serviceLabel: serialized.serviceLabel,
      vehicleId: serialized.vehicleId,
      vehicleLabel: serialized.vehicleLabel,
      date: serialized.date,
      time: serialized.time,
      status: serialized.status,
      notes: serialized.notes,
      createdAt: new Date(serialized.createdAt),
      updatedAt: new Date(serialized.updatedAt)
    } satisfies ReservationRecord;
  });
}

export async function findReservationForUser(
  userId: string,
  reservationId: string,
  email?: string | null
) {
  if (!userId) {
    return null;
  }

  await ensureDemoReservations(userId, email);

  const reservation = await findReservationRowForUser(userId, reservationId, email);

  if (!reservation) {
    return null;
  }

  const serialized = serializeReservation(
    reservation,
    await getReservationServiceLabelMap([reservation.serviceType])
  );
  return {
    id: serialized.id,
    userId,
    serviceId: serialized.serviceId,
    serviceLabel: serialized.serviceLabel,
    vehicleId: serialized.vehicleId,
    vehicleLabel: serialized.vehicleLabel,
    date: serialized.date,
    time: serialized.time,
    status: serialized.status,
    notes: serialized.notes,
    createdAt: new Date(serialized.createdAt),
    updatedAt: new Date(serialized.updatedAt)
  } satisfies ReservationRecord;
}

export async function getReservationCountForUser(userId: string, email?: string | null) {
  if (!userId) {
    return 0;
  }

  await ensureDemoReservations(userId, email);
  return prisma.reservation.count({ where: { userId } });
}

async function getReservedSlots(serviceId: string, date: string, excludeId?: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);
  const reservations = await prisma.reservation.findMany({
    where: {
      serviceType: serviceId,
      scheduledAt: {
        gte: start,
        lte: end
      },
      status: {
        not: PrismaReservationStatus.CANCELLED
      },
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: {
      scheduledAt: true
    }
  });

  return reservations.map(reservation => toTimeLabel(reservation.scheduledAt));
}

async function getAvailableSlots(serviceId: string, date: string, excludeId?: string) {
  const service = await findReservationServiceRecord(serviceId);
  const baseSlots = service?.slotTimes ?? ['09:00', '11:00', '14:00', '16:00'];
  const reservedSlots = new Set(await getReservedSlots(serviceId, date, excludeId));
  return baseSlots.filter(slot => !reservedSlots.has(slot));
}

async function listServicesWithReviewStats() {
  try {
    const services = await listReservationServiceCatalog();
    const reviews = await prisma.review.findMany({
      select: {
        rating: true,
        reservation: {
          select: {
            serviceType: true
          }
        }
      }
    });

    const statsByService = new Map<string, { total: number; count: number }>();

    for (const review of reviews) {
      const serviceId = review.reservation.serviceType;
      const existing = statsByService.get(serviceId) ?? { total: 0, count: 0 };
      existing.total += review.rating;
      existing.count += 1;
      statsByService.set(serviceId, existing);
    }

    return services.map(service => {
      const stats = statsByService.get(service.id);
      const reviewCount = stats?.count ?? 0;
      const reviewAverage =
        reviewCount > 0 && stats ? Number((stats.total / reviewCount).toFixed(1)) : 0;

      return {
        ...service,
        reviewAverage,
        reviewCount
      } satisfies ReservationServiceOption;
    });
  } catch (error) {
    console.error('Error aggregating reservation service reviews:', error);
    return listReservationServiceCatalog();
  }
}

export const listReservationServices = async (_req: Request, res: Response) => {
  res.json(await listServicesWithReviewStats());
};

export const listAvailableSlots = async (req: Request, res: Response) => {
  const serviceId = typeof req.query.serviceId === 'string' ? req.query.serviceId : '';
  const date = typeof req.query.date === 'string' ? req.query.date : '';
  const excludeId =
    typeof req.query.excludeId === 'string' && req.query.excludeId.trim()
      ? req.query.excludeId.trim()
      : undefined;

  if (!serviceId || !date) {
    res.status(400).json({
      message: 'serviceId and date query parameters are required'
    });
    return;
  }

  res.json(await getAvailableSlots(serviceId, date, excludeId));
};

export const listReservations = async (_req: Request, res: Response) => {
  const { userId, email } = getAuthenticatedUser(res);
  const reservations = await readReservationsForUser(userId, email);
  const serviceLabelMap = await getReservationServiceLabelMap(
    reservations.map(reservation => reservation.serviceType)
  );
  res.json(reservations.map(reservation => serializeReservation(reservation, serviceLabelMap)));
};

export const createReservation = async (req: Request, res: Response) => {
  const { userId, email } = getAuthenticatedUser(res);
  await ensureDemoReservations(userId, email);

  const serviceId = typeof req.body?.serviceId === 'string' ? req.body.serviceId.trim() : '';
  const date = typeof req.body?.date === 'string' ? req.body.date.trim() : '';
  const time = typeof req.body?.time === 'string' ? req.body.time.trim() : '';
  const vehicleId =
    typeof req.body?.vehicleId === 'string' && req.body.vehicleId.trim()
      ? req.body.vehicleId.trim()
      : null;
  const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : null;

  if (!serviceId || !date || !time) {
    res.status(400).json({
      message: 'serviceId, date and time are required'
    });
    return;
  }

  const service = await findReservationServiceRecord(serviceId);
  if (!service) {
    res.status(404).json({
      message: `Unknown reservation service: ${serviceId}`
    });
    return;
  }

  if (vehicleId) {
    const vehicle = await findVehicleById(userId, vehicleId);
    if (!vehicle) {
      res.status(404).json({
        message: 'Vehicule introuvable pour cet utilisateur'
      });
      return;
    }
  }

  const availableSlots = await getAvailableSlots(serviceId, date);
  if (!availableSlots.includes(time)) {
    res.status(409).json({
      message: 'Selected slot is not available'
    });
    return;
  }

  const scheduledAt = buildScheduledAt(date, time);
  const pricing = calculateReservationPricingFromSubtotal(service.price);
  const canLinkVehicle = await isReservationVehicleLinkAvailable();

  const reservation = await prisma.reservation.create({
    data: {
      userId,
      serviceType: service.id,
      ...(canLinkVehicle ? { vehicleId } : {}),
      description: notes,
      status: PrismaReservationStatus.CONFIRMED,
      scheduledAt,
      amount: new Prisma.Decimal(pricing.totalAmount.toFixed(2)),
      currency: 'CAD'
    },
    select: canLinkVehicle
      ? {
          id: true,
          userId: true,
          serviceType: true,
          vehicleId: true,
          vehicle: {
            select: {
              name: true,
              model: true
            }
          },
          description: true,
          status: true,
          scheduledAt: true,
          createdAt: true,
          updatedAt: true
        }
      : {
          id: true,
          userId: true,
          serviceType: true,
          description: true,
          status: true,
          scheduledAt: true,
          createdAt: true,
          updatedAt: true
        }
  });

  res.status(201).json(
    serializeReservation(
      toReservationQueryRecord(reservation),
      await getReservationServiceLabelMap([service.id])
    )
  );
};

export const getReservationById = async (req: Request, res: Response) => {
  const { userId, email } = getAuthenticatedUser(res);
  const reservation = await findReservationForUser(userId, req.params.id, email);

  if (!reservation) {
    res.status(404).json({
      message: `Reservation ${req.params.id} not found`
    });
    return;
  }

  res.json({
    ...reservation,
    serviceLabel:
      (await getReservationServiceLabelMap([reservation.serviceId])).get(reservation.serviceId) ??
      reservation.serviceLabel,
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString()
  });
};

export const updateReservation = async (req: Request, res: Response) => {
  const { userId, email } = getAuthenticatedUser(res);
  const existingReservation = await findReservationForUser(userId, req.params.id, email);

  if (!existingReservation) {
    res.status(404).json({
      message: `Reservation ${req.params.id} not found`
    });
    return;
  }

  const nextServiceId =
    typeof req.body?.serviceId === 'string' && req.body.serviceId.trim()
      ? req.body.serviceId.trim()
      : existingReservation.serviceId;
  const nextDate =
    typeof req.body?.date === 'string' && req.body.date.trim()
      ? req.body.date.trim()
      : existingReservation.date;
  const nextTime =
    typeof req.body?.time === 'string' && req.body.time.trim()
      ? req.body.time.trim()
      : existingReservation.time;
  const nextVehicleId =
    typeof req.body?.vehicleId === 'string'
      ? req.body.vehicleId.trim() || null
      : existingReservation.vehicleId ?? null;

  const service = await findReservationServiceRecord(nextServiceId);
  if (!service) {
    res.status(404).json({
      message: `Unknown reservation service: ${nextServiceId}`
    });
    return;
  }

  if (nextVehicleId) {
    const vehicle = await findVehicleById(userId, nextVehicleId);
    if (!vehicle) {
      res.status(404).json({
        message: 'Vehicule introuvable pour cet utilisateur'
      });
      return;
    }
  }

  const slotChanged =
    nextServiceId !== existingReservation.serviceId ||
    nextDate !== existingReservation.date ||
    nextTime !== existingReservation.time;

  if (slotChanged) {
    const availableSlots = await getAvailableSlots(nextServiceId, nextDate, existingReservation.id);
    if (!availableSlots.includes(nextTime)) {
      res.status(409).json({
        message: 'Selected slot is not available'
      });
      return;
    }
  }

  const nextStatus =
    typeof req.body?.status === 'string' ? toPrismaStatus(req.body.status) : null;
  const pricing = calculateReservationPricingFromSubtotal(service.price);
  const canLinkVehicle = await isReservationVehicleLinkAvailable();

  const reservation = await prisma.reservation.update({
    where: { id: existingReservation.id },
    data: {
      serviceType: service.id,
      ...(canLinkVehicle ? { vehicleId: nextVehicleId } : {}),
      description: typeof req.body?.notes === 'string' ? req.body.notes.trim() || null : existingReservation.notes ?? null,
      status: nextStatus ?? toPrismaStatus(existingReservation.status) ?? PrismaReservationStatus.CONFIRMED,
      scheduledAt: buildScheduledAt(nextDate, nextTime),
      amount: new Prisma.Decimal(pricing.totalAmount.toFixed(2)),
      currency: 'CAD'
    },
    select: canLinkVehicle
      ? {
          id: true,
          userId: true,
          serviceType: true,
          vehicleId: true,
          vehicle: {
            select: {
              name: true,
              model: true
            }
          },
          description: true,
          status: true,
          scheduledAt: true,
          createdAt: true,
          updatedAt: true
        }
      : {
          id: true,
          userId: true,
          serviceType: true,
          description: true,
          status: true,
          scheduledAt: true,
          createdAt: true,
          updatedAt: true
        }
  });

  res.json(
    serializeReservation(
      toReservationQueryRecord(reservation),
      await getReservationServiceLabelMap([service.id])
    )
  );
};

export const uploadReservationPhoto = createPlaceholderHandler('reservations', 'uploadPhoto');
export const payReservation = createPlaceholderHandler('reservations', 'pay');

export const __reservationsControllerInternals = {
  toIsoDate,
  toTimeLabel,
  toPrismaStatus,
  fromPrismaStatus,
  buildScheduledAt,
  formatReservationVehicleLabel,
  toReservationQueryRecord,
  serializeReservation
};
