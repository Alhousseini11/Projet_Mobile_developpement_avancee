import { ReservationStatus, Role } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../../data/prisma/client';
import { AppError } from '../../shared/errors';
import {
  buildReservationServiceMap,
  createReservationServiceRecord,
  listReservationServiceCatalog
} from '../reservations/reservationServices.store';

type AdminSummaryPayload = {
  metrics: {
    totalUsers: number;
    totalReservations: number;
    upcomingReservations: number;
    pendingReservations: number;
    totalReviews: number;
    activeServices: number;
  };
  recentReservations: Array<{
    id: string;
    serviceLabel: string;
    customerName: string;
    customerEmail: string;
    status: string;
    scheduledAt: string;
    amount: number;
    currency: string;
  }>;
  recentReviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    serviceLabel: string;
    customerName: string;
    createdAt: string;
  }>;
};

type AdminUserPayload = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
  vehicleCount: number;
  reservationCount: number;
  reviewCount: number;
  createdAt: string;
};

type AdminReservationPayload = {
  id: string;
  serviceId: string;
  serviceLabel: string;
  customerName: string;
  customerEmail: string;
  status: string;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
  amount: number;
  currency: string;
  notes: string | null;
};

function toIso(value: Date) {
  return value.toISOString();
}

function normalizeTrimmedString(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizePositiveInteger(value: unknown, fieldName: string) {
  const normalized = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new AppError(`${fieldName} doit etre un entier positif.`, 400);
  }

  return normalized;
}

function normalizePositiveAmount(value: unknown) {
  const normalized = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));

  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new AppError('Le prix doit etre un nombre positif.', 400);
  }

  return Number(normalized.toFixed(2));
}

function normalizeSlotTimes(value: unknown) {
  const rawValues =
    Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(/[\n,;]/)
        : [];

  const slotTimes = Array.from(
    new Set(
      rawValues
        .map(item => String(item).trim())
        .filter(Boolean)
    )
  );

  if (slotTimes.length === 0) {
    throw new AppError('Au moins un horaire est requis.', 400);
  }

  for (const slotTime of slotTimes) {
    if (!/^\d{2}:\d{2}$/.test(slotTime)) {
      throw new AppError(`Horaire invalide: ${slotTime}. Utilisez HH:MM.`, 400);
    }
  }

  return slotTimes.sort((left, right) => left.localeCompare(right));
}

function slugifyService(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeServiceDraft(body: unknown) {
  const payload = (body ?? {}) as Record<string, unknown>;
  const label = normalizeTrimmedString(payload.label);

  if (label.length < 2) {
    throw new AppError('Le libelle du service est obligatoire.', 400);
  }

  const slugInput = normalizeTrimmedString(payload.slug);
  const slug = slugifyService(slugInput || label);
  if (!slug) {
    throw new AppError('Impossible de generer un identifiant de service valide.', 400);
  }

  return {
    slug,
    label,
    description: normalizeTrimmedString(payload.description) || null,
    durationMinutes: normalizePositiveInteger(payload.durationMinutes, 'La duree'),
    price: normalizePositiveAmount(payload.price),
    slotTimes: normalizeSlotTimes(payload.slotTimes)
  };
}

function formatReservationStatus(status: ReservationStatus) {
  return status.toLowerCase();
}

async function buildAdminSummary() {
  const now = new Date();
  const [
    totalUsers,
    totalReservations,
    upcomingReservations,
    pendingReservations,
    totalReviews,
    activeServices,
    recentReservations,
    recentReviews
  ] = await Promise.all([
    prisma.user.count(),
    prisma.reservation.count(),
    prisma.reservation.count({
      where: {
        scheduledAt: {
          gte: now
        }
      }
    }),
    prisma.reservation.count({
      where: {
        status: {
          in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED]
        }
      }
    }),
    prisma.review.count(),
    prisma.reservationService.count({
      where: {
        active: true
      }
    }),
    prisma.reservation.findMany({
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
      take: 6,
      select: {
        id: true,
        serviceType: true,
        status: true,
        scheduledAt: true,
        amount: true,
        currency: true,
        user: {
          select: {
            fullName: true,
            email: true
          }
        }
      }
    }),
    prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: {
          select: {
            fullName: true
          }
        },
        reservation: {
          select: {
            serviceType: true
          }
        }
      }
    })
  ]);

  const serviceMap = await buildReservationServiceMap([
    ...recentReservations.map(reservation => reservation.serviceType),
    ...recentReviews.map(review => review.reservation.serviceType)
  ]);

  return {
    metrics: {
      totalUsers,
      totalReservations,
      upcomingReservations,
      pendingReservations,
      totalReviews,
      activeServices
    },
    recentReservations: recentReservations.map(reservation => ({
      id: reservation.id,
      serviceLabel: serviceMap.get(reservation.serviceType)?.label ?? reservation.serviceType,
      customerName: reservation.user.fullName,
      customerEmail: reservation.user.email,
      status: formatReservationStatus(reservation.status),
      scheduledAt: toIso(reservation.scheduledAt),
      amount: Number(reservation.amount.toFixed(2)),
      currency: reservation.currency
    })),
    recentReviews: recentReviews.map(review => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      serviceLabel: serviceMap.get(review.reservation.serviceType)?.label ?? review.reservation.serviceType,
      customerName: review.user.fullName,
      createdAt: toIso(review.createdAt)
    }))
  } satisfies AdminSummaryPayload;
}

async function buildAdminUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          vehicles: true,
          reservations: true,
          reviews: true
        }
      }
    }
  });

  return users.map(user => ({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    vehicleCount: user._count.vehicles,
    reservationCount: user._count.reservations,
    reviewCount: user._count.reviews,
    createdAt: toIso(user.createdAt)
  })) satisfies AdminUserPayload[];
}

async function buildAdminReservations() {
  const reservations = await prisma.reservation.findMany({
    orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }],
    take: 100,
    select: {
      id: true,
      serviceType: true,
      status: true,
      scheduledAt: true,
      createdAt: true,
      updatedAt: true,
      amount: true,
      currency: true,
      description: true,
      user: {
        select: {
          fullName: true,
          email: true
        }
      }
    }
  });

  const serviceMap = await buildReservationServiceMap(
    reservations.map(reservation => reservation.serviceType)
  );

  return reservations.map(reservation => ({
    id: reservation.id,
    serviceId: reservation.serviceType,
    serviceLabel: serviceMap.get(reservation.serviceType)?.label ?? reservation.serviceType,
    customerName: reservation.user.fullName,
    customerEmail: reservation.user.email,
    status: formatReservationStatus(reservation.status),
    scheduledAt: toIso(reservation.scheduledAt),
    createdAt: toIso(reservation.createdAt),
    updatedAt: toIso(reservation.updatedAt),
    amount: Number(reservation.amount.toFixed(2)),
    currency: reservation.currency,
    notes: reservation.description
  })) satisfies AdminReservationPayload[];
}

function toAdminErrorResponse(res: Response, error: unknown) {
  const status = error instanceof AppError ? error.status : 500;
  const message = error instanceof Error ? error.message : 'Internal error';
  return res.status(status).json({ message });
}

export async function getAdminSummary(_req: Request, res: Response) {
  try {
    res.json(await buildAdminSummary());
  } catch (error) {
    return toAdminErrorResponse(res, error);
  }
}

export async function listAdminUsers(_req: Request, res: Response) {
  try {
    res.json(await buildAdminUsers());
  } catch (error) {
    return toAdminErrorResponse(res, error);
  }
}

export async function listAdminReservations(_req: Request, res: Response) {
  try {
    res.json(await buildAdminReservations());
  } catch (error) {
    return toAdminErrorResponse(res, error);
  }
}

export async function listAdminServices(_req: Request, res: Response) {
  try {
    res.json(await listReservationServiceCatalog({ activeOnly: false }));
  } catch (error) {
    return toAdminErrorResponse(res, error);
  }
}

export async function createAdminService(req: Request, res: Response) {
  try {
    const draft = normalizeServiceDraft(req.body);

    const existing = await prisma.reservationService.findUnique({
      where: {
        slug: draft.slug
      }
    });

    if (existing) {
      throw new AppError('Un service existe deja avec cet identifiant.', 409);
    }

    const created = await createReservationServiceRecord(draft);
    res.status(201).json(created);
  } catch (error) {
    return toAdminErrorResponse(res, error);
  }
}

export const __adminControllerInternals = {
  normalizeTrimmedString,
  normalizePositiveInteger,
  normalizePositiveAmount,
  normalizeSlotTimes,
  slugifyService,
  normalizeServiceDraft,
  formatReservationStatus
};
