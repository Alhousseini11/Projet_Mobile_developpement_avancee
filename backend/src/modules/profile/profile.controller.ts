import { Request, Response } from 'express';
import { prisma } from '../../data/prisma/client';
import {
  buildProfileResponseForUser,
  mapMembershipLabel,
  resolveProfileUser,
  toProfileUser
} from './profile.core';
import { __profileBillingInternals } from './profile.billing';
import { __profilePaymentsInternals } from './profile.payments';
import {
  buildProfileSettingsCreateData,
  buildProfileSettingsUpdateData,
  buildProfileUserUpdateData,
  hasProfileSettingsUpdate,
  normalizeProfileUpdatePayload
} from './profile.update';
import {
  normalizeOptionalDate,
  normalizeOptionalInteger,
  normalizeOptionalText
} from './profile.shared';

export async function getProfile(req: Request, res: Response) {
  const authenticatedUser = await resolveProfileUser(req);
  res.json(await buildProfileResponseForUser(authenticatedUser));
}

export async function updateProfile(req: Request, res: Response) {
  const body = normalizeProfileUpdatePayload(req.body);
  const authenticatedUser = await resolveProfileUser(req);

  let nextUser = authenticatedUser;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: authenticatedUser.id },
      data: buildProfileUserUpdateData(body, authenticatedUser),
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        createdAt: true
      }
    });

    nextUser = toProfileUser(updatedUser);
  } catch {
    res.status(409).json({
      message: 'Impossible de mettre a jour ce profil.'
    });
    return;
  }

  const settingsData = buildProfileSettingsUpdateData(body);
  if (hasProfileSettingsUpdate(settingsData)) {
    await prisma.userProfileSettings.upsert({
      where: { userId: nextUser.id },
      update: settingsData,
      create: buildProfileSettingsCreateData(nextUser.id, settingsData)
    });
  }

  res.json(await buildProfileResponseForUser(nextUser));
}

export const __profileControllerInternals = {
  normalizeOptionalText,
  normalizeOptionalDate,
  normalizeOptionalInteger,
  ...__profilePaymentsInternals,
  ...__profileBillingInternals,
  mapMembershipLabel
};
