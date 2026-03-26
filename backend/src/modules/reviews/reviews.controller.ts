import { Request, Response } from 'express';
import { normalizeEmail, isDemoUserEmail } from '../../config/demo';
import { prisma } from '../../data/prisma/client';
import {
  findReservationForUser,
  listReservationsForUser
} from '../reservations/reservations.controller';
import { getReservationServiceLabelMap } from '../reservations/reservationServices.store';

function getAuthenticatedUser(res: Response) {
  return {
    userId: String(res.locals.authUser?.id ?? ''),
    email: normalizeEmail(res.locals.authUser?.email)
  };
}

function toAppointmentDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

async function ensureDemoReview(userId: string, email?: string | null) {
  if (!userId || !isDemoUserEmail(email)) {
    return;
  }

  const reservations = await listReservationsForUser(userId, email);
  const demoReservation = reservations.find(item => item.serviceId === 'oil-change') ?? reservations[0];
  if (!demoReservation) {
    return;
  }

  await prisma.review.upsert({
    where: {
      userId_reservationId: {
        userId,
        reservationId: demoReservation.id
      }
    },
    update: {},
    create: {
      userId,
      reservationId: demoReservation.id,
      rating: 5,
      comment: 'Service rapide, accueil rassurant et explications claires.',
      createdAt: new Date('2026-03-11T10:00:00Z'),
      updatedAt: new Date('2026-03-11T10:00:00Z')
    }
  });
}

function serializeReview(
  review: {
  id: string;
  reservationId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
  reservation: {
    serviceType: string;
    scheduledAt: Date;
  };
},
  serviceLabelMap: Map<string, string>
) {
  return {
    id: review.id,
    reservationId: review.reservationId,
    reservationLabel:
      serviceLabelMap.get(review.reservation.serviceType) ?? review.reservation.serviceType,
    appointmentDate: toAppointmentDate(review.reservation.scheduledAt),
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString()
  };
}

function normalizeRating(value: unknown) {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    return null;
  }

  return parsed;
}

function normalizeComment(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 400) : null;
}

export async function listReviews(_req: Request, res: Response) {
  const { userId, email } = getAuthenticatedUser(res);
  await ensureDemoReview(userId, email);

  const reviews = await prisma.review.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      reservationId: true,
      rating: true,
      comment: true,
      createdAt: true,
      updatedAt: true,
      reservation: {
        select: {
          serviceType: true,
          scheduledAt: true
        }
      }
    }
  });

  const serviceLabelMap = await getReservationServiceLabelMap(
    reviews.map(review => review.reservation.serviceType)
  );
  res.json(reviews.map(review => serializeReview(review, serviceLabelMap)));
}

export async function upsertReview(req: Request, res: Response) {
  const { userId, email } = getAuthenticatedUser(res);
  const reservationId =
    typeof req.body?.reservationId === 'string' ? req.body.reservationId.trim() : '';
  const rating = normalizeRating(req.body?.rating);
  const comment = normalizeComment(req.body?.comment);

  if (!reservationId || rating === null) {
    res.status(400).json({
      message: 'reservationId et rating sont obligatoires.'
    });
    return;
  }

  const reservation = await findReservationForUser(userId, reservationId, email);
  if (!reservation) {
    res.status(404).json({
      message: 'Reservation introuvable pour cet utilisateur.'
    });
    return;
  }

  const review = await prisma.review.upsert({
    where: {
      userId_reservationId: {
        userId,
        reservationId
      }
    },
    update: {
      rating,
      comment
    },
    create: {
      userId,
      reservationId,
      rating,
      comment
    },
    select: {
      id: true,
      reservationId: true,
      rating: true,
      comment: true,
      createdAt: true,
      updatedAt: true,
      reservation: {
        select: {
          serviceType: true,
          scheduledAt: true
        }
      }
    }
  });

  const serviceLabelMap = await getReservationServiceLabelMap([review.reservation.serviceType]);
  res.status(review.createdAt.getTime() === review.updatedAt.getTime() ? 201 : 200).json(
    serializeReview(review, serviceLabelMap)
  );
}
