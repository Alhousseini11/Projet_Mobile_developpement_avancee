import { Prisma } from '../../data/prisma/generatedClient';
import { prisma } from '../../data/prisma/client';
import {
  DEFAULT_RESERVATION_SERVICE_DEFINITIONS,
  type ReservationServiceOption
} from './reservationCatalog';

export interface ReservationServiceRecord extends ReservationServiceOption {
  description: string | null;
  slotTimes: string[];
  active: boolean;
}

function toReservationServiceRecord(input: {
  slug: string;
  label: string;
  description?: string | null;
  durationMinutes: number;
  price: number;
  slotTimes: string[];
  active?: boolean;
  reviewAverage?: number;
  reviewCount?: number;
}): ReservationServiceRecord {
  return {
    id: input.slug,
    label: input.label,
    description: input.description ?? null,
    durationMinutes: input.durationMinutes,
    price: input.price,
    slotTimes: input.slotTimes,
    active: input.active ?? true,
    reviewAverage: input.reviewAverage ?? 0,
    reviewCount: input.reviewCount ?? 0
  };
}

function buildDefaultReservationServiceMap() {
  return new Map(
    DEFAULT_RESERVATION_SERVICE_DEFINITIONS.map(service => [
      service.id,
      toReservationServiceRecord({
        slug: service.id,
        label: service.label,
        description: service.description,
        durationMinutes: service.durationMinutes,
        price: service.price,
        slotTimes: service.slotTimes,
        active: true
      })
    ])
  );
}

function findDefaultReservationServiceDefinition(serviceId: string) {
  return DEFAULT_RESERVATION_SERVICE_DEFINITIONS.find(service => service.id === serviceId) ?? null;
}

function toNumber(value: Prisma.Decimal) {
  return Number(value.toFixed(2));
}

function normalizeSlotTimes(slotTimes: string[]) {
  return slotTimes
    .map(slot => slot.trim())
    .filter(Boolean);
}

export async function buildReservationServiceMap(serviceIds?: string[]) {
  const serviceMap = buildDefaultReservationServiceMap();
  const uniqueServiceIds = Array.from(new Set((serviceIds ?? []).filter(Boolean)));

  const services = await prisma.reservationService.findMany({
    where: uniqueServiceIds.length > 0 ? { slug: { in: uniqueServiceIds } } : undefined,
    orderBy: {
      label: 'asc'
    }
  });

  for (const service of services) {
    serviceMap.set(
      service.slug,
      toReservationServiceRecord({
        slug: service.slug,
        label: service.label,
        description: service.description,
        durationMinutes: service.durationMinutes,
        price: toNumber(service.price),
        slotTimes: normalizeSlotTimes(service.slotTimes),
        active: service.active
      })
    );
  }

  return serviceMap;
}

export async function listReservationServiceCatalog(options?: { activeOnly?: boolean }) {
  const activeOnly = options?.activeOnly ?? true;
  const serviceMap = await buildReservationServiceMap();

  return Array.from(serviceMap.values())
    .filter(service => (activeOnly ? service.active : true))
    .sort((left, right) => left.label.localeCompare(right.label, 'fr'));
}

export async function findReservationServiceRecord(serviceId: string, options?: { includeInactive?: boolean }) {
  if (!serviceId) {
    return null;
  }

  const serviceMap = await buildReservationServiceMap([serviceId]);
  const service = serviceMap.get(serviceId) ?? null;
  if (!service) {
    return null;
  }

  if (options?.includeInactive) {
    return service;
  }

  return service.active ? service : null;
}

export async function getReservationServiceLabelMap(serviceIds: string[]) {
  const serviceMap = await buildReservationServiceMap(serviceIds);

  return new Map(
    Array.from(serviceMap.entries()).map(([serviceId, service]) => [serviceId, service.label])
  );
}

export async function createReservationServiceRecord(input: {
  slug: string;
  label: string;
  description?: string | null;
  durationMinutes: number;
  price: number;
  slotTimes: string[];
}) {
  const created = await prisma.reservationService.create({
    data: {
      slug: input.slug,
      label: input.label,
      description: input.description ?? null,
      durationMinutes: input.durationMinutes,
      price: new Prisma.Decimal(input.price.toFixed(2)),
      slotTimes: normalizeSlotTimes(input.slotTimes),
      active: true
    }
  });

  return toReservationServiceRecord({
    slug: created.slug,
    label: created.label,
    description: created.description,
    durationMinutes: created.durationMinutes,
    price: toNumber(created.price),
    slotTimes: normalizeSlotTimes(created.slotTimes),
    active: created.active
  });
}

export async function updateReservationServiceRecord(
  serviceId: string,
  input: {
    label: string;
    description?: string | null;
    durationMinutes: number;
    price: number;
    slotTimes: string[];
  }
) {
  const existing = await prisma.reservationService.findUnique({
    where: {
      slug: serviceId
    }
  });

  if (existing) {
    const updated = await prisma.reservationService.update({
      where: {
        slug: serviceId
      },
      data: {
        label: input.label,
        description: input.description ?? null,
        durationMinutes: input.durationMinutes,
        price: new Prisma.Decimal(input.price.toFixed(2)),
        slotTimes: normalizeSlotTimes(input.slotTimes)
      }
    });

    return toReservationServiceRecord({
      slug: updated.slug,
      label: updated.label,
      description: updated.description,
      durationMinutes: updated.durationMinutes,
      price: toNumber(updated.price),
      slotTimes: normalizeSlotTimes(updated.slotTimes),
      active: updated.active
    });
  }

  const defaultService = findDefaultReservationServiceDefinition(serviceId);
  if (!defaultService) {
    return null;
  }

  const created = await prisma.reservationService.create({
    data: {
      slug: serviceId,
      label: input.label,
      description: input.description ?? null,
      durationMinutes: input.durationMinutes,
      price: new Prisma.Decimal(input.price.toFixed(2)),
      slotTimes: normalizeSlotTimes(input.slotTimes),
      active: true
    }
  });

  return toReservationServiceRecord({
    slug: created.slug,
    label: created.label,
    description: created.description,
    durationMinutes: created.durationMinutes,
    price: toNumber(created.price),
    slotTimes: normalizeSlotTimes(created.slotTimes),
    active: created.active
  });
}

export async function archiveReservationServiceRecord(serviceId: string) {
  const existing = await prisma.reservationService.findUnique({
    where: {
      slug: serviceId
    }
  });

  if (existing) {
    const updated = await prisma.reservationService.update({
      where: {
        slug: serviceId
      },
      data: {
        active: false
      }
    });

    return toReservationServiceRecord({
      slug: updated.slug,
      label: updated.label,
      description: updated.description,
      durationMinutes: updated.durationMinutes,
      price: toNumber(updated.price),
      slotTimes: normalizeSlotTimes(updated.slotTimes),
      active: updated.active
    });
  }

  const defaultService = findDefaultReservationServiceDefinition(serviceId);
  if (!defaultService) {
    return null;
  }

  const created = await prisma.reservationService.create({
    data: {
      slug: defaultService.id,
      label: defaultService.label,
      description: defaultService.description,
      durationMinutes: defaultService.durationMinutes,
      price: new Prisma.Decimal(defaultService.price.toFixed(2)),
      slotTimes: normalizeSlotTimes(defaultService.slotTimes),
      active: false
    }
  });

  return toReservationServiceRecord({
    slug: created.slug,
    label: created.label,
    description: created.description,
    durationMinutes: created.durationMinutes,
    price: toNumber(created.price),
    slotTimes: normalizeSlotTimes(created.slotTimes),
    active: created.active
  });
}
