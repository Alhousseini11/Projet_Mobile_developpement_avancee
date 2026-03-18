import { apiRequest } from '@/utils/api'
import { readStoredSession } from '@/utils/authStorage'
import type { HomeFeed } from '@/types/home'

const DEFAULT_PROMO_MESSAGE = 'Promos: 20% sur les freins cette semaine.'
const DEFAULT_REMINDER_MESSAGE = 'Rappel: Consultez vos vehicules pour planifier votre prochain entretien.'

function getFallbackDisplayName() {
  const fullName = readStoredSession()?.user.fullName ?? 'Alex Martin'
  return fullName.split(/\s+/)[0] ?? 'Alex'
}

class HomeService {
  getFallbackFeed(): HomeFeed {
    return {
      displayName: getFallbackDisplayName(),
      nextAppointmentLabel: 'Aucun rendez-vous planifie pour le moment.',
      promoMessage: DEFAULT_PROMO_MESSAGE,
      reminderMessage: DEFAULT_REMINDER_MESSAGE
    }
  }

  async getHomeFeed(): Promise<HomeFeed> {
    try {
      return await apiRequest<HomeFeed>('/home', { timeoutMs: 6000 })
    } catch (error) {
      console.error('Error fetching home feed:', error)
      return this.getFallbackFeed()
    }
  }
}

export default new HomeService()
