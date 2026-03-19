import { ReservationStatus } from '@prisma/client';
import { Request, Response } from 'express';
import { logger } from '../../config/logger';
import { prisma } from '../../data/prisma/client';
import { resolveOptionalRequestUser } from '../auth/auth.service';

interface HomeFeedPayload {
  displayName: string;
  nextAppointmentLabel: string;
  promoMessage: string;
  reminderMessage: string;
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

export async function getHomeFeed(req: Request, res: Response) {
  try {
    const authenticatedUser = await resolveOptionalRequestUser(req);
    const displayName = getFirstName(authenticatedUser?.fullName);

    if (!authenticatedUser) {
      res.json(buildDefaultFeed(displayName));
      return;
    }

    const nextReservation = await prisma.reservation.findFirst({
      where: {
        userId: authenticatedUser.id,
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

    const primaryVehicle = await prisma.vehicle.findFirst({
      where: { userId: authenticatedUser.id },
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

    const nextReminder = primaryVehicle
      ? await prisma.reminder.findFirst({
          where: {
            vehicleId: primaryVehicle.id
          },
          orderBy: {
            dueAt: 'asc'
          },
          select: {
            title: true,
            dueAt: true
          }
        })
      : null;

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
