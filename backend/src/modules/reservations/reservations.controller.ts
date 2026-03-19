import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { createPlaceholderHandler } from '../_shared/createPlaceholderHandler';

type ReservationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
const DEMO_ACCOUNT_EMAIL = 'alex.martin@example.com';

interface ReservationServiceOption {
  id: string;
  label: string;
  durationMinutes: number;
  price: number;
}

export interface ReservationRecord {
  id: string;
  userId: string;
  serviceId: string;
  serviceLabel: string;
  date: string;
  time: string;
  status: ReservationStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RESERVATION_SERVICES: ReservationServiceOption[] = [
  {
    id: 'oil-change',
    label: 'Vidange',
    durationMinutes: 45,
    price: 79
  },
  {
    id: 'brakes',
    label: 'Freins',
    durationMinutes: 90,
    price: 149
  },
  {
    id: 'battery',
    label: 'Batterie',
    durationMinutes: 30,
    price: 99
  },
  {
    id: 'diagnostic',
    label: 'Diagnostic',
    durationMinutes: 60,
    price: 59
  }
];

const SLOT_BY_SERVICE: Record<string, string[]> = {
  'oil-change': ['08:30', '10:00', '13:30', '15:00'],
  brakes: ['09:00', '11:30', '14:00', '16:30'],
  battery: ['08:00', '10:30', '13:00', '17:00'],
  diagnostic: ['09:30', '12:00', '15:30', '18:00']
};

const DEMO_RESERVATION_SEED: Array<Omit<ReservationRecord, 'userId'>> = [
  {
    id: 'reservation-1',
    serviceId: 'oil-change',
    serviceLabel: 'Vidange',
    date: '2026-03-18',
    time: '10:00',
    status: 'confirmed',
    createdAt: new Date('2026-03-10T09:00:00Z'),
    updatedAt: new Date('2026-03-10T09:00:00Z')
  },
  {
    id: 'reservation-2',
    serviceId: 'diagnostic',
    serviceLabel: 'Diagnostic',
    date: '2026-03-22',
    time: '15:30',
    status: 'pending',
    createdAt: new Date('2026-03-12T14:15:00Z'),
    updatedAt: new Date('2026-03-12T14:15:00Z')
  }
];

const reservationsByUser = new Map<string, ReservationRecord[]>();

function getAuthenticatedUser(res: Response) {
  return {
    userId: String(res.locals.authUser?.id ?? ''),
    email:
      typeof res.locals.authUser?.email === 'string'
        ? res.locals.authUser.email.trim().toLowerCase()
        : null
  };
}

function createDemoReservations(userId: string) {
  return DEMO_RESERVATION_SEED.map(reservation => ({
    ...reservation,
    id: `${userId}-${reservation.id}`,
    userId
  }));
}

function getUserReservations(userId: string, email?: string | null) {
  const existing = reservationsByUser.get(userId);
  if (existing) {
    return existing;
  }

  const initialReservations =
    email === DEMO_ACCOUNT_EMAIL ? createDemoReservations(userId) : [];
  reservationsByUser.set(userId, initialReservations);
  return initialReservations;
}

export function listReservationsForUser(userId: string, email?: string | null) {
  if (!userId) {
    return [] as ReservationRecord[];
  }

  return [...getUserReservations(userId, email)];
}

export function findReservationForUser(
  userId: string,
  reservationId: string,
  email?: string | null
) {
  return getUserReservations(userId, email).find(item => item.id === reservationId) ?? null;
}

function getAllReservations() {
  return [...reservationsByUser.values()].flatMap(userReservations => userReservations);
}

export function getReservationCountForUser(userId: string, email?: string | null) {
  if (!userId) {
    return 0;
  }

  return getUserReservations(userId, email).length;
}

function serializeReservation(reservation: ReservationRecord) {
  const { userId: _userId, ...payload } = reservation;
  return {
    ...payload,
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString()
  };
}

function findService(serviceId: string) {
  return RESERVATION_SERVICES.find(service => service.id === serviceId) ?? null;
}

function getReservedSlots(serviceId: string, date: string, excludeId?: string) {
  return getAllReservations()
    .filter(
      reservation =>
        reservation.id !== excludeId &&
        reservation.serviceId === serviceId &&
        reservation.date === date &&
        reservation.status !== 'cancelled'
    )
    .map(reservation => reservation.time);
}

function getAvailableSlots(serviceId: string, date: string, excludeId?: string) {
  const baseSlots = SLOT_BY_SERVICE[serviceId] ?? ['09:00', '11:00', '14:00', '16:00'];
  const reservedSlots = new Set(getReservedSlots(serviceId, date, excludeId));
  return baseSlots.filter(slot => !reservedSlots.has(slot));
}

export const listReservationServices = async (_req: Request, res: Response) => {
  res.json(RESERVATION_SERVICES);
};

export const listAvailableSlots = async (req: Request, res: Response) => {
  const serviceId = typeof req.query.serviceId === 'string' ? req.query.serviceId : '';
  const date = typeof req.query.date === 'string' ? req.query.date : '';

  if (!serviceId || !date) {
    res.status(400).json({
      message: 'serviceId and date query parameters are required'
    });
    return;
  }

  res.json(getAvailableSlots(serviceId, date));
};

export const listReservations = async (_req: Request, res: Response) => {
  const { userId, email } = getAuthenticatedUser(res);
  const sortedReservations = [...getUserReservations(userId, email)].sort((left, right) => {
    const leftKey = `${left.date}T${left.time}:00`;
    const rightKey = `${right.date}T${right.time}:00`;
    return leftKey.localeCompare(rightKey);
  });

  res.json(sortedReservations.map(serializeReservation));
};

export const createReservation = async (req: Request, res: Response) => {
  const { userId, email } = getAuthenticatedUser(res);
  const serviceId = typeof req.body?.serviceId === 'string' ? req.body.serviceId : '';
  const date = typeof req.body?.date === 'string' ? req.body.date : '';
  const time = typeof req.body?.time === 'string' ? req.body.time : '';
  const notes = typeof req.body?.notes === 'string' ? req.body.notes : undefined;

  if (!serviceId || !date || !time) {
    res.status(400).json({
      message: 'serviceId, date and time are required'
    });
    return;
  }

  const service = findService(serviceId);
  if (!service) {
    res.status(404).json({
      message: `Unknown reservation service: ${serviceId}`
    });
    return;
  }

  const availableSlots = getAvailableSlots(serviceId, date);
  if (!availableSlots.includes(time)) {
    res.status(409).json({
      message: 'Selected slot is not available'
    });
    return;
  }

  const now = new Date();
  const userReservations = getUserReservations(userId, email);
  const reservation: ReservationRecord = {
    id: randomUUID(),
    userId,
    serviceId,
    serviceLabel:
      typeof req.body?.serviceLabel === 'string' && req.body.serviceLabel.trim()
        ? req.body.serviceLabel
        : service.label,
    date,
    time,
    status: 'confirmed',
    notes,
    createdAt: now,
    updatedAt: now
  };

  userReservations.unshift(reservation);
  res.status(201).json(serializeReservation(reservation));
};

export const getReservationById = async (req: Request, res: Response) => {
  const { userId, email } = getAuthenticatedUser(res);
  const reservation = getUserReservations(userId, email).find(item => item.id === req.params.id);

  if (!reservation) {
    res.status(404).json({
      message: `Reservation ${req.params.id} not found`
    });
    return;
  }

  res.json(serializeReservation(reservation));
};

export const updateReservation = async (req: Request, res: Response) => {
  const { userId, email } = getAuthenticatedUser(res);
  const reservation = getUserReservations(userId, email).find(item => item.id === req.params.id);

  if (!reservation) {
    res.status(404).json({
      message: `Reservation ${req.params.id} not found`
    });
    return;
  }

  const nextServiceId =
    typeof req.body?.serviceId === 'string' && req.body.serviceId.trim()
      ? req.body.serviceId
      : reservation.serviceId;
  const nextDate =
    typeof req.body?.date === 'string' && req.body.date.trim() ? req.body.date : reservation.date;
  const nextTime =
    typeof req.body?.time === 'string' && req.body.time.trim() ? req.body.time : reservation.time;

  const service = findService(nextServiceId);
  if (!service) {
    res.status(404).json({
      message: `Unknown reservation service: ${nextServiceId}`
    });
    return;
  }

  const availableSlots = getAvailableSlots(nextServiceId, nextDate, reservation.id);
  const slotChanged =
    nextServiceId !== reservation.serviceId ||
    nextDate !== reservation.date ||
    nextTime !== reservation.time;

  if (slotChanged && !availableSlots.includes(nextTime)) {
    res.status(409).json({
      message: 'Selected slot is not available'
    });
    return;
  }

  reservation.serviceId = nextServiceId;
  reservation.serviceLabel =
    typeof req.body?.serviceLabel === 'string' && req.body.serviceLabel.trim()
      ? req.body.serviceLabel
      : service.label;
  reservation.date = nextDate;
  reservation.time = nextTime;

  if (
    typeof req.body?.status === 'string' &&
    ['pending', 'confirmed', 'completed', 'cancelled'].includes(req.body.status)
  ) {
    reservation.status = req.body.status as ReservationStatus;
  }

  if (typeof req.body?.notes === 'string') {
    reservation.notes = req.body.notes;
  }

  reservation.updatedAt = new Date();
  res.json(serializeReservation(reservation));
};

export const uploadReservationPhoto = createPlaceholderHandler('reservations', 'uploadPhoto');
export const payReservation = createPlaceholderHandler('reservations', 'pay');
