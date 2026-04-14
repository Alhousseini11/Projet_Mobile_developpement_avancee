import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.service';
import { hasOwnProperty, normalizeOptionalText } from './profile.shared';

export interface ProfileUpdatePayload {
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  preferredGarage?: unknown;
  addressLine?: unknown;
  city?: unknown;
  notes?: unknown;
}

export function normalizeProfileUpdatePayload(value: unknown): ProfileUpdatePayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as ProfileUpdatePayload;
}

export function buildProfileUserUpdateData(
  payload: ProfileUpdatePayload,
  authenticatedUser: AuthenticatedUser
): Prisma.UserUpdateInput {
  return {
    fullName:
      typeof payload.fullName === 'string' && payload.fullName.trim()
        ? payload.fullName.trim()
        : authenticatedUser.fullName,
    email:
      typeof payload.email === 'string' && payload.email.trim()
        ? payload.email.trim().toLowerCase()
        : authenticatedUser.email,
    phone:
      typeof payload.phone === 'string'
        ? payload.phone.trim() || null
        : authenticatedUser.phone
  };
}

export function buildProfileSettingsUpdateData(payload: ProfileUpdatePayload) {
  const settingsData: Prisma.UserProfileSettingsUncheckedUpdateInput = {};

  if (hasOwnProperty(payload, 'preferredGarage')) {
    settingsData.preferredGarage = normalizeOptionalText(payload.preferredGarage);
  }

  if (hasOwnProperty(payload, 'addressLine')) {
    settingsData.addressLine = normalizeOptionalText(payload.addressLine);
  }

  if (hasOwnProperty(payload, 'city')) {
    settingsData.city = normalizeOptionalText(payload.city);
  }

  if (hasOwnProperty(payload, 'notes')) {
    settingsData.notes = normalizeOptionalText(payload.notes);
  }

  return settingsData;
}

export function hasProfileSettingsUpdate(settingsData: Prisma.UserProfileSettingsUncheckedUpdateInput) {
  return Object.keys(settingsData).length > 0;
}

export function buildProfileSettingsCreateData(
  userId: string,
  settingsData: Prisma.UserProfileSettingsUncheckedUpdateInput
): Prisma.UserProfileSettingsUncheckedCreateInput {
  const createData: Prisma.UserProfileSettingsUncheckedCreateInput = { userId };

  if (hasOwnProperty(settingsData, 'preferredGarage')) {
    createData.preferredGarage = settingsData.preferredGarage as string | null | undefined;
  }

  if (hasOwnProperty(settingsData, 'addressLine')) {
    createData.addressLine = settingsData.addressLine as string | null | undefined;
  }

  if (hasOwnProperty(settingsData, 'city')) {
    createData.city = settingsData.city as string | null | undefined;
  }

  if (hasOwnProperty(settingsData, 'notes')) {
    createData.notes = settingsData.notes as string | null | undefined;
  }

  return createData;
}
