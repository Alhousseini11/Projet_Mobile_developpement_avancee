import { logger as defaultLogger } from '../../config/logger';
import { prisma as defaultPrisma } from '../../data/prisma/client';
import { ReservationStatus, type PrismaClient } from '../../data/prisma/generatedClient';
import { isSchemaDriftError as defaultIsSchemaDriftError } from '../_shared/isSchemaDriftError';
import { isCurrentVehicleSchemaAvailable as defaultIsCurrentVehicleSchemaAvailable } from '../_shared/schemaCapabilities';

export interface HomeReservationRecord {
  serviceType: string;
  scheduledAt: Date;
}

export interface HomeVehicleRecord {
  id: string;
  name: string;
  model: string;
  mileage: number | null;
}

export interface HomeReminderRecord {
  title: string | null;
  dueAt: Date | null;
}

export interface HomeFeedRepository {
  getNextReservation(userId: string): Promise<HomeReservationRecord | null>;
  getPrimaryVehicle(userId: string): Promise<HomeVehicleRecord | null>;
  getNextReminder(vehicleId: string): Promise<HomeReminderRecord | null>;
}

interface LegacyHomeVehicleRow {
  id: string;
  brand: string;
  model: string;
  mileage: number | null;
}

interface HomeRepositoryLogger {
  warn(context: { err: unknown; userId?: string; vehicleId?: string }, message: string): void;
}

interface HomeRepositoryDeps {
  prisma?: PrismaClient;
  logger?: HomeRepositoryLogger;
  isCurrentVehicleSchemaAvailable?: () => Promise<boolean>;
  isSchemaDriftError?: (error: unknown) => boolean;
}

function mapLegacyVehicle(vehicle: LegacyHomeVehicleRow): HomeVehicleRecord {
  return {
    id: vehicle.id,
    name: vehicle.brand,
    model: vehicle.model,
    mileage: vehicle.mileage
  };
}

export function createHomeRepository(deps: HomeRepositoryDeps = {}): HomeFeedRepository {
  const prisma = deps.prisma ?? defaultPrisma;
  const logger = deps.logger ?? defaultLogger;
  const isCurrentVehicleSchemaAvailable =
    deps.isCurrentVehicleSchemaAvailable ?? defaultIsCurrentVehicleSchemaAvailable;
  const isSchemaDriftError = deps.isSchemaDriftError ?? defaultIsSchemaDriftError;

  async function readLegacyVehicle(userId: string) {
    try {
      const vehicles = await prisma.$queryRaw<LegacyHomeVehicleRow[]>`
        SELECT "id", "brand", "model", "mileage"
        FROM "Vehicle"
        WHERE "userId" = ${userId}
        ORDER BY "id" DESC
        LIMIT 1
      `;

      const vehicle = vehicles[0];
      return vehicle ? mapLegacyVehicle(vehicle) : null;
    } catch (error) {
      logger.warn({ err: error, userId }, 'Unable to load vehicle context for home feed');
      return null;
    }
  }

  return {
    async getNextReservation(userId: string) {
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
    },

    async getPrimaryVehicle(userId: string) {
      if (!(await isCurrentVehicleSchemaAvailable())) {
        return readLegacyVehicle(userId);
      }

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
      } catch (error) {
        if (!isSchemaDriftError(error)) {
          logger.warn({ err: error, userId }, 'Unable to load vehicle context for home feed');
          return null;
        }

        logger.warn({ err: error, userId }, 'Falling back to legacy home vehicle schema');
        return readLegacyVehicle(userId);
      }
    },

    async getNextReminder(vehicleId: string) {
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
  };
}

export const homeRepository = createHomeRepository();
