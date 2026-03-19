import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { findReservationForUser, listReservationsForUser } from '../reservations/reservations.controller';

const DEMO_ACCOUNT_EMAIL = 'alex.martin@example.com';

interface ReviewRecord {
  id: string;
  userId: string;
  reservationId: string;
  reservationLabel: string;
  appointmentDate: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const reviewsByUser = new Map<string, ReviewRecord[]>();

function getAuthenticatedUser(res: Response) {
  return {
    userId: String(res.locals.authUser?.id ?? ''),
    email:
      typeof res.locals.authUser?.email === 'string'
        ? res.locals.authUser.email.trim().toLowerCase()
        : null
  };
}

function createDemoReviews(userId: string, email?: string | null) {
  if (email !== DEMO_ACCOUNT_EMAIL) {
    return [] as ReviewRecord[];
  }

  const reservations = listReservationsForUser(userId, email);
  const demoReservation = reservations.find(item => item.serviceId === 'oil-change') ?? reservations[0];
  if (!demoReservation) {
    return [];
  }

  return [
    {
      id: `${userId}-review-1`,
      userId,
      reservationId: demoReservation.id,
      reservationLabel: demoReservation.serviceLabel,
      appointmentDate: demoReservation.date,
      rating: 5,
      comment: 'Service rapide, accueil rassurant et explications claires.',
      createdAt: new Date('2026-03-11T10:00:00Z'),
      updatedAt: new Date('2026-03-11T10:00:00Z')
    }
  ];
}

function getUserReviews(userId: string, email?: string | null) {
  const existing = reviewsByUser.get(userId);
  if (existing) {
    return existing;
  }

  const initialReviews = createDemoReviews(userId, email);
  reviewsByUser.set(userId, initialReviews);
  return initialReviews;
}

function serializeReview(review: ReviewRecord) {
  const { userId: _userId, ...payload } = review;
  return {
    ...payload,
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
  const reviews = [...getUserReviews(userId, email)].sort(
    (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime()
  );

  res.json(reviews.map(serializeReview));
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

  const reservation = findReservationForUser(userId, reservationId, email);
  if (!reservation) {
    res.status(404).json({
      message: 'Reservation introuvable pour cet utilisateur.'
    });
    return;
  }

  const userReviews = getUserReviews(userId, email);
  const existingReview = userReviews.find(item => item.reservationId === reservationId);

  if (existingReview) {
    existingReview.rating = rating;
    existingReview.comment = comment;
    existingReview.reservationLabel = reservation.serviceLabel;
    existingReview.appointmentDate = reservation.date;
    existingReview.updatedAt = new Date();
    res.json(serializeReview(existingReview));
    return;
  }

  const now = new Date();
  const review: ReviewRecord = {
    id: randomUUID(),
    userId,
    reservationId,
    reservationLabel: reservation.serviceLabel,
    appointmentDate: reservation.date,
    rating,
    comment,
    createdAt: now,
    updatedAt: now
  };

  userReviews.unshift(review);
  res.status(201).json(serializeReview(review));
}
