import { ReservationStatus } from '@prisma/client';
import { Request, Response } from 'express';
import { logger } from '../../config/logger';
import { prisma } from '../../data/prisma/client';
import { resolveOptionalRequestUser } from '../auth/auth.service';

type NotificationType = 'info' | 'success' | 'warning' | 'alert';

interface NotificationPayload {
	id: string;
	title: string;
	message: string;
	type: NotificationType;
	createdAt: string;
	read: boolean;
}

function toIso(value: Date | string) {
	const date = value instanceof Date ? value : new Date(value);

	if (Number.isNaN(date.getTime())) {
		return new Date().toISOString();
	}

	return date.toISOString();
}

function buildGuestNotifications(): NotificationPayload[] {
	const now = Date.now();

	return [
		{
			id: 'guest-notification-1',
			title: 'Bienvenue sur votre espace client',
			message: 'Connectez-vous pour recevoir vos rappels de rendez-vous et mises a jour atelier.',
			type: 'info',
			createdAt: toIso(new Date(now - 15 * 60 * 1000)),
			read: false
		},
		{
			id: 'guest-notification-2',
			title: 'Support disponible',
			message: 'Consultez la section Support et FAQ pour obtenir de l aide rapidement.',
			type: 'success',
			createdAt: toIso(new Date(now - 2 * 60 * 60 * 1000)),
			read: true
		}
	];
}

function createNotification(input: {
	id: string;
	title: string;
	message: string;
	type: NotificationType;
	createdAt: Date | string;
	read?: boolean;
}): NotificationPayload {
	return {
		id: input.id,
		title: input.title,
		message: input.message,
		type: input.type,
		createdAt: toIso(input.createdAt),
		read: Boolean(input.read)
	};
}

export async function listNotifications(req: Request, res: Response) {
	try {
		const authenticatedUser = await resolveOptionalRequestUser(req);

		if (!authenticatedUser) {
			return res.json(buildGuestNotifications());
		}

		const [nextReservation, latestReservation, nextReminder, vehicleCount] = await Promise.all([
			prisma.reservation.findFirst({
				where: {
					userId: authenticatedUser.id,
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
					id: true,
					serviceType: true,
					scheduledAt: true,
					createdAt: true
				}
			}),
			prisma.reservation.findFirst({
				where: {
					userId: authenticatedUser.id
				},
				orderBy: {
					updatedAt: 'desc'
				},
				select: {
					id: true,
					status: true,
					serviceType: true,
					updatedAt: true
				}
			}),
			prisma.reminder.findFirst({
				where: {
					vehicle: {
						userId: authenticatedUser.id
					},
					dueAt: {
						gte: new Date()
					}
				},
				orderBy: {
					dueAt: 'asc'
				},
				select: {
					id: true,
					title: true,
					dueAt: true
				}
			}),
			prisma.vehicle.count({
				where: {
					userId: authenticatedUser.id
				}
			})
		]);

		const items: NotificationPayload[] = [];

		if (nextReservation) {
			items.push(
				createNotification({
					id: `reservation-next-${nextReservation.id}`,
					title: 'Prochain rendez-vous',
					message: `${nextReservation.serviceType} planifie le ${nextReservation.scheduledAt.toLocaleString('fr-CA')}.`,
					type: 'success',
					createdAt: nextReservation.createdAt,
					read: false
				})
			);
		}

		if (nextReminder) {
			items.push(
				createNotification({
					id: `reminder-${nextReminder.id}`,
					title: nextReminder.title || 'Rappel entretien',
					message: `Echeance prevue le ${nextReminder.dueAt.toLocaleDateString('fr-CA')}.`,
					type: 'warning',
					createdAt: nextReminder.dueAt,
					read: false
				})
			);
		}

		if (latestReservation) {
			const isCancelled = latestReservation.status === ReservationStatus.CANCELLED;
			items.push(
				createNotification({
					id: `reservation-latest-${latestReservation.id}`,
					title: isCancelled ? 'Rendez-vous annule' : 'Activite recente',
					message: `Derniere mise a jour: ${latestReservation.serviceType}.`,
					type: isCancelled ? 'alert' : 'info',
					createdAt: latestReservation.updatedAt,
					read: true
				})
			);
		}

		if (vehicleCount === 0) {
			items.push(
				createNotification({
					id: 'vehicle-missing',
					title: 'Ajoutez votre vehicule',
					message: 'Ajoutez un vehicule pour recevoir des rappels personnalises.',
					type: 'info',
					createdAt: new Date(),
					read: false
				})
			);
		}

		if (items.length === 0) {
			items.push(
				createNotification({
					id: 'notifications-empty',
					title: 'Tout est a jour',
					message: 'Aucune nouvelle notification pour le moment.',
					type: 'info',
					createdAt: new Date(),
					read: true
				})
			);
		}

		items.sort((left, right) => right.createdAt.localeCompare(left.createdAt));

		return res.json(items);
	} catch (error) {
		logger.error({ err: error }, 'Error listing notifications');
		return res.json(buildGuestNotifications());
	}
}
