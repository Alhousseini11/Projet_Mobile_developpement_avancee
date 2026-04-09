import { ReservationStatus, Role, TutorialCategory, TutorialDifficulty } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../../data/prisma/client';
import { AppError } from '../../shared/errors';
import {
  archiveReservationServiceRecord,
  buildReservationServiceMap,
  createReservationServiceRecord,
  listReservationServiceCatalog,
  updateReservationServiceRecord
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
  active: boolean;
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

type AdminTutorialPayload = {
  id: string;
  title: string;
  description: string;
  category: TutorialCategory;
  difficulty: TutorialDifficulty;
  duration: number;
  views: number;
  rating: number;
  thumbnail: string;
  videoUrl: string;
  instructions: string[];
  tools: string[];
  createdAt: string;
  updatedAt: string;
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

function normalizeOptionalTrimmedString(value: unknown) {
  const normalized = normalizeTrimmedString(value);
  return normalized.length > 0 ? normalized : null;
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

function normalizeUserActiveFlag(value: unknown) {
  if (typeof value !== 'boolean') {
    throw new AppError('Le statut actif doit etre un booleen.', 400);
  }

  return value;
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

function normalizeStringList(value: unknown, fieldName: string, options?: { required?: boolean }) {
  const entries =
    Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(/[\n,;]/)
        : [];

  const normalized = Array.from(
    new Set(
      entries
        .map(item => String(item).trim())
        .filter(Boolean)
    )
  );

  if (options?.required && normalized.length === 0) {
    throw new AppError(`${fieldName} est obligatoire.`, 400);
  }

  return normalized;
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

function normalizeTutorialCategory(value: unknown): TutorialCategory {
  switch (normalizeTrimmedString(value).toLowerCase()) {
    case 'freins':
      return TutorialCategory.freins;
    case 'suspension':
      return TutorialCategory.suspension;
    case 'batterie':
      return TutorialCategory.batterie;
    case 'diagnostic':
      return TutorialCategory.diagnostic;
    case 'eclairage':
      return TutorialCategory.eclairage;
    case 'fluide':
      return TutorialCategory.fluide;
    case 'mecanique':
      return TutorialCategory.mecanique;
    case 'entretien':
    default:
      return TutorialCategory.entretien;
  }
}

function normalizeTutorialDifficulty(value: unknown): TutorialDifficulty {
  switch (normalizeTrimmedString(value).toLowerCase()) {
    case 'difficile':
      return TutorialDifficulty.difficile;
    case 'moyen':
      return TutorialDifficulty.moyen;
    case 'facile':
    default:
      return TutorialDifficulty.facile;
  }
}

function buildPublicAssetUrl(req: Request, relativePath: string) {
  return `${req.protocol}://${req.get('host')}${relativePath}`;
}

const adminUserSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  active: true,
  createdAt: true,
  _count: {
    select: {
      vehicles: true,
      reservations: true,
      reviews: true
    }
  }
} as const;

function mapAdminUser(user: {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
  active: boolean;
  createdAt: Date;
  _count: {
    vehicles: number;
    reservations: number;
    reviews: number;
  };
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    active: user.active,
    vehicleCount: user._count.vehicles,
    reservationCount: user._count.reservations,
    reviewCount: user._count.reviews,
    createdAt: toIso(user.createdAt)
  } satisfies AdminUserPayload;
}

function mapAdminTutorial(tutorial: {
  id: string;
  title: string;
  description: string;
  category: TutorialCategory;
  difficulty: TutorialDifficulty;
  duration: number;
  views: number;
  rating: number;
  thumbnail: string;
  videoUrl: string;
  instructions: unknown;
  tools: unknown;
  createdAt: Date;
  updatedAt: Date;
}): AdminTutorialPayload {
  return {
    id: tutorial.id,
    title: tutorial.title,
    description: tutorial.description,
    category: tutorial.category,
    difficulty: tutorial.difficulty,
    duration: tutorial.duration,
    views: tutorial.views,
    rating: tutorial.rating,
    thumbnail: tutorial.thumbnail,
    videoUrl: tutorial.videoUrl,
    instructions: Array.isArray(tutorial.instructions)
      ? tutorial.instructions.filter((entry): entry is string => typeof entry === 'string')
      : [],
    tools: Array.isArray(tutorial.tools)
      ? tutorial.tools.filter((entry): entry is string => typeof entry === 'string')
      : [],
    createdAt: toIso(tutorial.createdAt),
    updatedAt: toIso(tutorial.updatedAt)
  };
}

function normalizeTutorialDraft(req: Request) {
  const payload = req.body as Record<string, unknown>;
  const title = normalizeTrimmedString(payload.title);
  const description = normalizeTrimmedString(payload.description);

  if (title.length < 4) {
    throw new AppError('Le titre du tutoriel est obligatoire.', 400);
  }

  if (description.length < 8) {
    throw new AppError('La description du tutoriel est obligatoire.', 400);
  }

  if (!req.file) {
    throw new AppError('Ajoutez un fichier video depuis votre ordinateur.', 400);
  }

  return {
    title,
    description,
    category: normalizeTutorialCategory(payload.category),
    difficulty: normalizeTutorialDifficulty(payload.difficulty),
    duration: normalizePositiveInteger(payload.duration, 'La duree'),
    thumbnail: normalizeOptionalTrimmedString(payload.thumbnail) || 'https://placehold.co/640x360?text=Garage+Mechanic',
    videoUrl: buildPublicAssetUrl(req, `/uploads/tutorials/${req.file.filename}`),
    instructions: normalizeStringList(payload.instructions, 'Au moins une instruction', { required: true }),
    tools: normalizeStringList(payload.tools, 'Les outils')
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
    select: adminUserSelect
  });

  return users.map(mapAdminUser) satisfies AdminUserPayload[];
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

async function buildAdminTutorials() {
  const tutorials = await prisma.tutorial.findMany({
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      difficulty: true,
      duration: true,
      views: true,
      rating: true,
      thumbnail: true,
      videoUrl: true,
      instructions: true,
      tools: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return tutorials.map(mapAdminTutorial);
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

export async function updateAdminUserActivation(req: Request, res: Response) {
  try {
    const userId = normalizeTrimmedString(req.params.userId);
    if (!userId) {
      throw new AppError('Utilisateur introuvable.', 404);
    }

    const nextActive = normalizeUserActiveFlag((req.body as Record<string, unknown> | null)?.active);
    const actorUserId = normalizeTrimmedString(String(res.locals.authUser?.id ?? ''));

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: adminUserSelect
    });

    if (!existing) {
      throw new AppError('Utilisateur introuvable.', 404);
    }

    if (!nextActive && existing.id === actorUserId) {
      throw new AppError('Vous ne pouvez pas desactiver votre propre compte.', 400);
    }

    if (!nextActive && existing.active && existing.role === Role.ADMIN) {
      const remainingActiveAdmins = await prisma.user.count({
        where: {
          role: Role.ADMIN,
          active: true,
          id: {
            not: existing.id
          }
        }
      });

      if (remainingActiveAdmins === 0) {
        throw new AppError('Impossible de desactiver le dernier administrateur actif.', 400);
      }
    }

    if (existing.active === nextActive) {
      res.json(mapAdminUser(existing));
      return;
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        active: nextActive
      },
      select: adminUserSelect
    });

    res.json(mapAdminUser(updated));
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

export async function updateAdminService(req: Request, res: Response) {
  try {
    const serviceId = normalizeTrimmedString(req.params.serviceId);
    if (!serviceId) {
      throw new AppError('Service introuvable.', 404);
    }

    const draft = normalizeServiceDraft(req.body);
    const updated = await updateReservationServiceRecord(serviceId, {
      label: draft.label,
      description: draft.description,
      durationMinutes: draft.durationMinutes,
      price: draft.price,
      slotTimes: draft.slotTimes
    });

    if (!updated) {
      throw new AppError('Service introuvable.', 404);
    }

    res.json(updated);
  } catch (error) {
    return toAdminErrorResponse(res, error);
  }
}

export async function deleteAdminService(req: Request, res: Response) {
  try {
    const serviceId = normalizeTrimmedString(req.params.serviceId);
    if (!serviceId) {
      throw new AppError('Service introuvable.', 404);
    }

    const archived = await archiveReservationServiceRecord(serviceId);
    if (!archived) {
      throw new AppError('Service introuvable.', 404);
    }

    res.json(archived);
  } catch (error) {
    return toAdminErrorResponse(res, error);
  }
}

export async function listAdminTutorials(_req: Request, res: Response) {
  try {
    res.json(await buildAdminTutorials());
  } catch (error) {
    return toAdminErrorResponse(res, error);
  }
}

export async function createAdminTutorial(req: Request, res: Response) {
  try {
    const draft = normalizeTutorialDraft(req);
    const created = await prisma.tutorial.create({
      data: {
        title: draft.title,
        description: draft.description,
        category: draft.category,
        difficulty: draft.difficulty,
        duration: draft.duration,
        views: 0,
        rating: 0,
        thumbnail: draft.thumbnail,
        videoUrl: draft.videoUrl,
        instructions: draft.instructions,
        tools: draft.tools
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        difficulty: true,
        duration: true,
        views: true,
        rating: true,
        thumbnail: true,
        videoUrl: true,
        instructions: true,
        tools: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json(mapAdminTutorial(created));
  } catch (error) {
    return toAdminErrorResponse(res, error);
  }
}

export const __adminControllerInternals = {
  normalizeTrimmedString,
  normalizeOptionalTrimmedString,
  normalizePositiveInteger,
  normalizePositiveAmount,
  normalizeUserActiveFlag,
  normalizeSlotTimes,
  normalizeStringList,
  slugifyService,
  normalizeServiceDraft,
  normalizeTutorialCategory,
  normalizeTutorialDifficulty,
  formatReservationStatus
};
