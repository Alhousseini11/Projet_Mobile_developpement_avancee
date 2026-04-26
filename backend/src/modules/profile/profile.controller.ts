import { NextFunction, Request, Response } from 'express';
import { isDemoUserEmail } from '../../config/demo';
import { prisma } from '../../data/prisma/client';
import { AppError } from '../../shared/errors';
import { assertCurrentUserPassword } from '../auth/auth.service';
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

export async function deleteAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const authenticatedUser = await resolveProfileUser(req);

    if (isDemoUserEmail(authenticatedUser.email)) {
      throw new AppError('Le compte de demonstration ne peut pas etre supprime.', 403);
    }

    await assertCurrentUserPassword(authenticatedUser.id, String(req.body?.password ?? ''));

    await prisma.$transaction(async tx => {
      const vehicleRows = await tx.vehicle.findMany({
        where: { userId: authenticatedUser.id },
        select: { id: true }
      });
      const vehicleIds = vehicleRows.map(vehicle => vehicle.id);

      const ownedReservationRows = await tx.reservation.findMany({
        where: {
          OR: [
            { userId: authenticatedUser.id },
            ...(vehicleIds.length > 0 ? [{ vehicleId: { in: vehicleIds } }] : [])
          ]
        },
        select: { id: true }
      });
      const ownedReservationIds = ownedReservationRows.map(reservation => reservation.id);

      await tx.reservation.updateMany({
        where: { mechanicId: authenticatedUser.id },
        data: { mechanicId: null }
      });

      if (ownedReservationIds.length > 0) {
        await tx.review.deleteMany({
          where: { reservationId: { in: ownedReservationIds } }
        });

        await tx.reservationPhoto.deleteMany({
          where: { reservationId: { in: ownedReservationIds } }
        });
      }

      await tx.review.deleteMany({
        where: { userId: authenticatedUser.id }
      });

      await tx.favorite.deleteMany({
        where: { userId: authenticatedUser.id }
      });

      await tx.tutorialView.deleteMany({
        where: { userId: authenticatedUser.id }
      });

      await tx.tutorialRating.deleteMany({
        where: { userId: authenticatedUser.id }
      });

      await tx.notification.deleteMany({
        where: { userId: authenticatedUser.id }
      });

      await tx.passwordResetCode.deleteMany({
        where: { userId: authenticatedUser.id }
      });

      await tx.paymentMethod.deleteMany({
        where: { userId: authenticatedUser.id }
      });

      await tx.userProfileSettings.deleteMany({
        where: { userId: authenticatedUser.id }
      });

      await tx.quote.deleteMany({
        where: { userId: authenticatedUser.id }
      });

      await tx.chatMessage.deleteMany({
        where: {
          OR: [{ senderId: authenticatedUser.id }, { receiverId: authenticatedUser.id }]
        }
      });

      if (vehicleIds.length > 0) {
        await tx.reminder.deleteMany({
          where: { vehicleId: { in: vehicleIds } }
        });

        await tx.maintenanceRecord.deleteMany({
          where: { vehicleId: { in: vehicleIds } }
        });

        await tx.vehicleDocument.deleteMany({
          where: { vehicleId: { in: vehicleIds } }
        });

        await tx.vehicleInsurance.deleteMany({
          where: { vehicleId: { in: vehicleIds } }
        });
      }

      if (ownedReservationIds.length > 0) {
        await tx.reservation.deleteMany({
          where: { id: { in: ownedReservationIds } }
        });
      }

      if (vehicleIds.length > 0) {
        await tx.vehicle.deleteMany({
          where: { id: { in: vehicleIds } }
        });
      }

      await tx.user.delete({
        where: { id: authenticatedUser.id }
      });
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export const __profileControllerInternals = {
  normalizeOptionalText,
  normalizeOptionalDate,
  normalizeOptionalInteger,
  ...__profilePaymentsInternals,
  ...__profileBillingInternals,
  mapMembershipLabel
};
