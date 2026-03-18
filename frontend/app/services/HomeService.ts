import { apiRequest } from '@/utils/api'
import { readStoredSession } from '@/utils/authStorage'
import type { HomeFeed } from '@/types/home'

const DEFAULT_PROMO_MESSAGE = 'Promos: 20% sur les freins cette semaine.'
const DEFAULT_REMINDER_MESSAGE = 'Rappel: Consultez vos vehicules pour planifier votre prochain entretien.'
const HOME_FEED_TIMEOUT_MS = 10000

let homeFeedRequest: Promise<HomeFeed> | null = null

function getFallbackDisplayName() {
  const fullName = readStoredSession()?.user.fullName ?? 'Alex Martin'
  return fullName.split(/\s+/)[0] ?? 'Alex'
}

function cloneHomeFeed(feed: HomeFeed): HomeFeed {
  return { ...feed }
}

class HomeService {
  getFallbackFeed(): HomeFeed {
    return cloneHomeFeed({
      displayName: getFallbackDisplayName(),
      nextAppointmentLabel: 'Aucun rendez-vous planifie pour le moment.',
      promoMessage: DEFAULT_PROMO_MESSAGE,
      reminderMessage: DEFAULT_REMINDER_MESSAGE
    })
  }

  async getHomeFeed(): Promise<HomeFeed> {
    if (homeFeedRequest) {
      return homeFeedRequest.then(cloneHomeFeed)
    }

    homeFeedRequest = (async () => {
      try {
        const feed = await apiRequest<HomeFeed>('/home', { timeoutMs: HOME_FEED_TIMEOUT_MS })
        return cloneHomeFeed(feed)
      } catch (error) {
        console.warn('Error fetching home feed:', error)
        return this.getFallbackFeed()
      } finally {
        homeFeedRequest = null
      }
    })()

    return homeFeedRequest.then(cloneHomeFeed)
  }
}

export default new HomeService()
