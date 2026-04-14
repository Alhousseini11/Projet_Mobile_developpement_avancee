import { Role } from '@prisma/client';
import type { Request } from 'express';
import { DEMO_ACCOUNT } from '../../config/demo';
import { prisma } from '../../data/prisma/client';
import { AppError } from '../../shared/errors';
import { isCurrentVehicleSchemaAvailable } from '../_shared/schemaCapabilities';
import {
  resolveOptionalRequestUser,
  type AuthenticatedUser
} from '../auth/auth.service';
import { getReservationCountForUser } from '../reservations/reservations.controller';
import type { ProfilePayload } from './profile.contracts';

const defaultProfileState = {
  phone: DEMO_ACCOUNT.phone,
  preferredGarage: 'Garage Montreal Centre',
  addressLine: 'Adresse a completer',
  city: 'Montreal, QC',
  notes: 'Compte client connecte via authentification backend.'
} as const;

export function mapMembershipLabel(role: Role) {
  if (role === Role.ADMIN) {
    return 'Administrateur';
  }

  if (role === Role.MECHANIC) {
    return 'Technicien';
  }

  return 'Client';
}

export function toProfileUser(user: {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  createdAt: Date;
}): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt
  };
}

export async function resolveProfileUser(req: Request) {
  const authenticatedUser = await resolveOptionalRequestUser(req);
  if (authenticatedUser) {
    return authenticatedUser;
  }

  throw new AppError('Authentification requise.', 401);
}

async function countVehicles(userId: string) {
  if (await isCurrentVehicleSchemaAvailable()) {
    return prisma.vehicle.count({ where: { userId } }).catch(() => 0);
  }

  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS "count"
    FROM "Vehicle"
    WHERE "userId" = ${userId}
  `;

  return Number(rows[0]?.count ?? 0);
}

export async function findDefaultVehicleLabel(userId: string) {
  if (await isCurrentVehicleSchemaAvailable()) {
    const vehicle = await prisma.vehicle
      .findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      })
      .catch(() => null);

    return vehicle ? `${vehicle.name} ${vehicle.model}` : null;
  }

  const rows = await prisma.$queryRaw<Array<{ name: string; model: string }>>`
    SELECT "name", "model"
    FROM "Vehicle"
    WHERE "userId" = ${userId}
    ORDER BY "id" DESC
    LIMIT 1
  `;

  const vehicle = rows[0];
  return vehicle ? `${vehicle.name} ${vehicle.model}` : null;
}

export async function buildProfileResponseForUser(
  authenticatedUser: AuthenticatedUser
): Promise<ProfilePayload> {
  const [settings, vehicleCount, appointmentCount, detectedVehicleLabel] = await Promise.all([
    prisma.userProfileSettings.findUnique({
      where: { userId: authenticatedUser.id }
    }),
    countVehicles(authenticatedUser.id).catch(() => 0),
    getReservationCountForUser(authenticatedUser.id, authenticatedUser.email).catch(() => 0),
    findDefaultVehicleLabel(authenticatedUser.id).catch(() => null)
  ]);

  const memberSince = settings?.memberSince ?? authenticatedUser.createdAt;
  const defaultVehicleLabel =
    settings?.defaultVehicleLabel ??
    detectedVehicleLabel ??
    'Aucun vehicule';

  return {
    id: authenticatedUser.id,
    fullName: authenticatedUser.fullName,
    email: authenticatedUser.email,
    phone: authenticatedUser.phone ?? defaultProfileState.phone,
    membershipLabel: settings?.membershipLabel ?? mapMembershipLabel(authenticatedUser.role),
    verified: settings?.verified ?? true,
    memberSince: memberSince.toISOString().slice(0, 10),
    preferredGarage: settings?.preferredGarage ?? defaultProfileState.preferredGarage,
    defaultVehicleLabel,
    appointmentCount,
    vehicleCount,
    loyaltyPoints: settings?.loyaltyPoints ?? appointmentCount * 60 + vehicleCount * 30,
    addressLine: settings?.addressLine ?? defaultProfileState.addressLine,
    city: settings?.city ?? defaultProfileState.city,
    notes: settings?.notes ?? defaultProfileState.notes
  };
}
