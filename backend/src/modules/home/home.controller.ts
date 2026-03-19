import { ReservationStatus } from '@prisma/client';
import { Request, Response } from 'express';
import { logger } from '../../config/logger';
import { prisma } from '../../data/prisma/client';
import { isSchemaDriftError } from '../_shared/isSchemaDriftError';
import { resolveOptionalRequestUser } from '../auth/auth.service';

interface HomeFeedPayload {
  displayName: string;
  nextAppointmentLabel: string;
  promoMessage: string;
  reminderMessage: string;
}

interface HomeVehicleRecord {
  id: string;
  name: string;
  model: string;
  mileage: number | null;
}

interface LegacyHomeVehicleRow {
  id: string;
  brand: string;
  model: string;
  mileage: number | null;
}

const DEFAULT_PROMO_MESSAGE = 'Promos: 20% sur les freins cette semaine.';

function getFirstName(fullName?: string | null) {
  const value = fullName?.trim() || 'Alex Martin';
  return value.split(/\s+/)[0] || 'Alex';
}

function capitalizeWords(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatAppointmentDate(date: Date) {
  const weekdays = [
    'Dimanche',
    'Lundi',
    'Mardi',
    'Mercredi',
    'Jeudi',
    'Vendredi',
    'Samedi'
  ];
  const months = [
    'janvier',
    'fevrier',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'aout',
    'septembre',
    'octobre',
    'novembre',
    'decembre'
  ];

  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');

  return `${weekdays[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} a ${hours}h${minutes}`;
}

function buildDefaultFeed(displayName: string): HomeFeedPayload {
  return {
    displayName,
    nextAppointmentLabel: 'Aucun rendez-vous planifie pour le moment.',
    promoMessage: DEFAULT_PROMO_MESSAGE,
    reminderMessage: 'Rappel: Consultez vos vehicules pour planifier votre prochain entretien.'
  };
}

function buildReminderMessage(params: {
  reminderTitle?: string | null;
  reminderDueAt?: Date | null;
  vehicleName?: string | null;
  vehicleModel?: string | null;
  vehicleMileage?: number | null;
}) {
  if (params.reminderTitle && params.reminderDueAt) {
    return `Rappel: ${params.reminderTitle} avant le ${formatAppointmentDate(params.reminderDueAt)}.`;
  }

  if (params.vehicleName && params.vehicleModel && typeof params.vehicleMileage === 'number') {
    const remainingKm = Math.max(500, 10000 - (params.vehicleMileage % 10000));
    return `Rappel: ${params.vehicleName} ${params.vehicleModel} approche du prochain entretien dans ${remainingKm.toLocaleString('fr-CA')} km.`;
  }

  return 'Rappel: Consultez vos vehicules pour planifier votre prochain entretien.';
}

async function readNextReservation(userId: string) {
  try {
    return await prisma.reservation.findFirst({
      where: {
        userId,
        status: {
          in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.PAID]
        },
        scheduledAt: {
          gte: new Date()
        }
      },
      orderBy: {
        scheduledAt: 'asc'
      },
      select: {
        serviceType: true,
        scheduledAt: true
      }
    });
  } catch (error) {
    logger.warn({ err: error, userId }, 'Unable to load reservation context for home feed');
    return null;
  }
}

async function readPrimaryVehicle(userId: string): Promise<HomeVehicleRecord | null> {
  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: { userId },
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        id: true,
        name: true,
        model: true,
        mileage: true
      }
    });

    if (!vehicle) {
      return null;
    }

    return {
      id: vehicle.id,
      name: vehicle.name,
      model: vehicle.model,
      mileage: vehicle.mileage
    };
  } catch (currentSchemaError) {
    if (!isSchemaDriftError(currentSchemaError)) {
      logger.warn({ err: currentSchemaError, userId }, 'Unable to load vehicle context for home feed');
      return null;
    }

    logger.warn({ err: currentSchemaError, userId }, 'Falling back to legacy home vehicle schema');

    try {
      const vehicles = await prisma.$queryRaw<LegacyHomeVehicleRow[]>`
        SELECT "id", "brand", "model", "mileage"
        FROM "Vehicle"
        WHERE "userId" = ${userId}
        ORDER BY "id" DESC
        LIMIT 1
      `;

      const vehicle = vehicles[0];
      if (!vehicle) {
        return null;
      }

      return {
        id: vehicle.id,
        name: vehicle.brand,
        model: vehicle.model,
        mileage: vehicle.mileage
      };
    } catch (legacySchemaError) {
      logger.warn({ err: legacySchemaError, userId }, 'Unable to load vehicle context for home feed');
      return null;
    }
  }
}

async function readNextReminder(vehicleId: string) {
  try {
    return await prisma.reminder.findFirst({
      where: {
        vehicleId
      },
      orderBy: {
        dueAt: 'asc'
      },
      select: {
        title: true,
        dueAt: true
      }
    });
  } catch (error) {
    logger.warn({ err: error, vehicleId }, 'Unable to load reminder for home feed');
    return null;
  }
}

export async function getHomeFeed(req: Request, res: Response) {
  try {
    const authenticatedUser = await resolveOptionalRequestUser(req);
    const displayName = getFirstName(authenticatedUser?.fullName);

    if (!authenticatedUser) {
      res.json(buildDefaultFeed(displayName));
      return;
    }

    const nextReservation = await readNextReservation(authenticatedUser.id);
    const primaryVehicle = await readPrimaryVehicle(authenticatedUser.id);
    const nextReminder = primaryVehicle ? await readNextReminder(primaryVehicle.id) : null;

    const fallbackFeed = buildDefaultFeed(displayName);
    const nextAppointmentLabel = nextReservation
      ? `${capitalizeWords(nextReservation.serviceType)} le ${formatAppointmentDate(nextReservation.scheduledAt)}`
      : fallbackFeed.nextAppointmentLabel;

    const reminderMessage = buildReminderMessage({
      reminderTitle: nextReminder?.title,
      reminderDueAt: nextReminder?.dueAt,
      vehicleName: primaryVehicle?.name,
      vehicleModel: primaryVehicle?.model,
      vehicleMileage: primaryVehicle?.mileage
    });

    res.json({
      displayName,
      nextAppointmentLabel,
      promoMessage: DEFAULT_PROMO_MESSAGE,
      reminderMessage
    } satisfies HomeFeedPayload);
  } catch (error) {
    logger.error({ err: error }, 'Error building home feed');
    const displayName = getFirstName(undefined);
    res.json(buildDefaultFeed(displayName));
  }
}
