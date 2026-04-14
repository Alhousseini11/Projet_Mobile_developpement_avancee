import { ReservationStatus } from '@prisma/client';
import { logger } from '../../config/logger';
import { prisma } from '../../data/prisma/client';
import { AppError } from '../../shared/errors';
import { getReservationServiceLabelMap } from '../reservations/reservationServices.store';

export type NotificationType = 'info' | 'success' | 'warning' | 'alert';
export type NotificationDateContextKind = 'appointment' | 'reminder' | 'update';

export interface NotificationDateContextPayload {
  kind: NotificationDateContextKind;
  at: string;
}

export interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  read: boolean;
  dateContext: NotificationDateContextPayload | null;
}

interface NotificationDraft {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: Date | string;
  read?: boolean;
  dateContext?: {
    kind: NotificationDateContextKind;
    at: Date | string;
  } | null;
}

interface SerializedNotification {
  payload: NotificationPayload;
  createdAtTimestamp: number;
}

function toIso(value: Date | string, context: { field: string; notificationId: string }) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    logger.error(
      {
        notificationId: context.notificationId,
        field: context.field,
        value
      },
      'Invalid notification date'
    );
    return null;
  }

  return date.toISOString();
}

function serializeDateContext(
  input: NotificationDraft['dateContext'],
  notificationId: string
): NotificationDateContextPayload | null {
  if (!input) {
    return null;
  }

  const at = toIso(input.at, {
    field: 'dateContext.at',
    notificationId
  });

  if (!at) {
    return null;
  }

  return {
    kind: input.kind,
    at
  };
}

function createNotification(input: NotificationDraft): SerializedNotification | null {
  const createdAt = toIso(input.createdAt, {
    field: 'createdAt',
    notificationId: input.id
  });

  if (!createdAt) {
    return null;
  }

  return {
    payload: {
      id: input.id,
      title: input.title,
      message: input.message,
      type: input.type,
      createdAt,
      read: Boolean(input.read),
      dateContext: serializeDateContext(input.dateContext ?? null, input.id)
    },
    createdAtTimestamp: new Date(createdAt).getTime()
  };
}

function sortNotifications(items: SerializedNotification[]) {
  return items.sort((left, right) => right.createdAtTimestamp - left.createdAtTimestamp);
}

function buildEmptyNotifications(now: Date) {
  const notification = createNotification({
    id: 'notifications-empty',
    title: 'Tout est a jour',
    message: 'Aucune nouvelle notification pour le moment.',
    type: 'info',
    createdAt: now,
    read: true
  });

  return notification ? [notification.payload] : [];
}

export async function listNotificationsForUser(userId: string) {
  if (!userId) {
    throw new AppError('Authentification requise.', 401);
  }

  const now = new Date();

  const [nextReservation, latestReservation, nextReminder, vehicleCount] = await Promise.all([
    prisma.reservation.findFirst({
      where: {
        userId,
        status: {
          in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.PAID]
        },
        scheduledAt: {
          gte: now
        }
      },
      orderBy: {
        scheduledAt: 'asc'
      },
      select: {
        id: true,
        serviceType: true,
        scheduledAt: true,
        createdAt: true
      }
    }),
    prisma.reservation.findFirst({
      where: {
        userId
      },
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        id: true,
        status: true,
        serviceType: true,
        updatedAt: true
      }
    }),
    prisma.reminder.findFirst({
      where: {
        vehicle: {
          userId
        }
      },
      orderBy: {
        dueAt: 'asc'
      },
      select: {
        id: true,
        title: true,
        dueAt: true
      }
    }),
    prisma.vehicle.count({
      where: {
        userId
      }
    })
  ]);
  const serviceLabelMap = await getReservationServiceLabelMap(
    [nextReservation?.serviceType, latestReservation?.serviceType].filter(
      (value): value is string => Boolean(value)
    )
  );

  const items: SerializedNotification[] = [];

  if (nextReservation) {
    const serviceLabel = serviceLabelMap.get(nextReservation.serviceType) ?? nextReservation.serviceType;
    const notification = createNotification({
      id: `reservation-next-${nextReservation.id}`,
      title: 'Prochain rendez-vous',
      message: `${serviceLabel} programme.`,
      type: 'success',
      createdAt: nextReservation.createdAt,
      read: false,
      dateContext: {
        kind: 'appointment',
        at: nextReservation.scheduledAt
      }
    });

    if (notification) {
      items.push(notification);
    }
  }

  if (nextReminder) {
    const notification = createNotification({
      id: `reminder-${nextReminder.id}`,
      title: nextReminder.title || 'Rappel entretien',
      message: 'Une echeance d entretien approche pour votre vehicule.',
      type: 'warning',
      createdAt: now,
      read: false,
      dateContext: {
        kind: 'reminder',
        at: nextReminder.dueAt
      }
    });

    if (notification) {
      items.push(notification);
    }
  }

  if (latestReservation) {
    const serviceLabel =
      serviceLabelMap.get(latestReservation.serviceType) ?? latestReservation.serviceType;
    const isCancelled = latestReservation.status === ReservationStatus.CANCELLED;
    const notification = createNotification({
      id: `reservation-latest-${latestReservation.id}`,
      title: isCancelled ? 'Rendez-vous annule' : 'Activite recente',
      message: isCancelled
        ? `${serviceLabel} annule.`
        : `Derniere mise a jour sur ${serviceLabel}.`,
      type: isCancelled ? 'alert' : 'info',
      createdAt: latestReservation.updatedAt,
      read: true,
      dateContext: {
        kind: 'update',
        at: latestReservation.updatedAt
      }
    });

    if (notification) {
      items.push(notification);
    }
  }

  if (vehicleCount === 0) {
    const notification = createNotification({
      id: 'vehicle-missing',
      title: 'Ajoutez votre vehicule',
      message: 'Ajoutez un vehicule pour recevoir des rappels personnalises.',
      type: 'info',
      createdAt: now,
      read: false
    });

    if (notification) {
      items.push(notification);
    }
  }

  if (items.length === 0) {
    return buildEmptyNotifications(now);
  }

  return sortNotifications(items).map(item => item.payload);
}
