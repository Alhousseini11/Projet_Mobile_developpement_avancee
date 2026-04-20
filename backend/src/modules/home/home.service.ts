import { logger as defaultLogger } from '../../config/logger';
import { homeRepository, type HomeFeedRepository, type HomeReminderRecord, type HomeReservationRecord, type HomeVehicleRecord } from './home.repository';

export interface HomeFeedPayload {
  displayName: string;
  nextAppointmentLabel: string;
  promoMessage: string;
  reminderMessage: string;
}

export interface HomeFeedUser {
  id: string;
  fullName?: string | null;
}

interface HomeServiceLogger {
  error(context: { err: unknown; userId?: string }, message: string): void;
}

interface HomeServiceDeps {
  repository?: HomeFeedRepository;
  logger?: HomeServiceLogger;
}

const DEFAULT_PROMO_MESSAGE = 'Promos: 20% sur les freins cette semaine.';
const DEFAULT_APPOINTMENT_LABEL = 'Aucun rendez-vous planifie pour le moment.';
const DEFAULT_REMINDER_MESSAGE =
  'Rappel: Consultez vos vehicules pour planifier votre prochain entretien.';

export function getFirstName(fullName?: string | null) {
  const value = fullName?.trim() || 'Alex Martin';
  return value.split(/\s+/)[0] || 'Alex';
}

export function capitalizeWords(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function formatAppointmentDate(date: Date) {
  const weekdays = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const months = [
    'janvier',
    'fevrier',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'aout',
    'septembre',
    'octobre',
    'novembre',
    'decembre'
  ];

  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');

  return `${weekdays[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} a ${hours}h${minutes}`;
}

export function buildDefaultFeed(displayName: string): HomeFeedPayload {
  return {
    displayName,
    nextAppointmentLabel: DEFAULT_APPOINTMENT_LABEL,
    promoMessage: DEFAULT_PROMO_MESSAGE,
    reminderMessage: DEFAULT_REMINDER_MESSAGE
  };
}

export function buildReminderMessage(params: {
  reminderTitle?: string | null;
  reminderDueAt?: Date | null;
  vehicleName?: string | null;
  vehicleModel?: string | null;
  vehicleMileage?: number | null;
}) {
  if (params.reminderTitle && params.reminderDueAt) {
    return `Rappel: ${params.reminderTitle} avant le ${formatAppointmentDate(params.reminderDueAt)}.`;
  }

  if (params.vehicleName && params.vehicleModel && typeof params.vehicleMileage === 'number') {
    const remainingKm = Math.max(500, 10000 - (params.vehicleMileage % 10000));
    return `Rappel: ${params.vehicleName} ${params.vehicleModel} approche du prochain entretien dans ${remainingKm.toLocaleString('fr-CA')} km.`;
  }

  return DEFAULT_REMINDER_MESSAGE;
}

function buildNextAppointmentLabel(nextReservation: HomeReservationRecord | null, fallbackLabel: string) {
  if (!nextReservation) {
    return fallbackLabel;
  }

  return `${capitalizeWords(nextReservation.serviceType)} le ${formatAppointmentDate(nextReservation.scheduledAt)}`;
}

function buildFeedFromContext(params: {
  displayName: string;
  fallbackFeed: HomeFeedPayload;
  nextReservation: HomeReservationRecord | null;
  primaryVehicle: HomeVehicleRecord | null;
  nextReminder: HomeReminderRecord | null;
}): HomeFeedPayload {
  return {
    displayName: params.displayName,
    nextAppointmentLabel: buildNextAppointmentLabel(
      params.nextReservation,
      params.fallbackFeed.nextAppointmentLabel
    ),
    promoMessage: DEFAULT_PROMO_MESSAGE,
    reminderMessage: buildReminderMessage({
      reminderTitle: params.nextReminder?.title,
      reminderDueAt: params.nextReminder?.dueAt,
      vehicleName: params.primaryVehicle?.name,
      vehicleModel: params.primaryVehicle?.model,
      vehicleMileage: params.primaryVehicle?.mileage
    })
  };
}

export function createHomeService(deps: HomeServiceDeps = {}) {
  const repository = deps.repository ?? homeRepository;
  const logger = deps.logger ?? defaultLogger;

  return {
    async getHomeFeed(user: HomeFeedUser | null | undefined): Promise<HomeFeedPayload> {
      const displayName = getFirstName(user?.fullName);
      const fallbackFeed = buildDefaultFeed(displayName);

      if (!user) {
        return fallbackFeed;
      }

      try {
        const [nextReservation, primaryVehicle] = await Promise.all([
          repository.getNextReservation(user.id),
          repository.getPrimaryVehicle(user.id)
        ]);
        const nextReminder = primaryVehicle ? await repository.getNextReminder(primaryVehicle.id) : null;

        return buildFeedFromContext({
          displayName,
          fallbackFeed,
          nextReservation,
          primaryVehicle,
          nextReminder
        });
      } catch (error) {
        logger.error({ err: error, userId: user.id }, 'Error building home feed');
        return fallbackFeed;
      }
    }
  };
}

export const homeService = createHomeService();

export const __homeServiceInternals = {
  getFirstName,
  capitalizeWords,
  formatAppointmentDate,
  buildDefaultFeed,
  buildReminderMessage
};
