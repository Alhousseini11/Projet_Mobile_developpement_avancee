import {
  DEMO_ACCOUNT,
  createDemoReviews,
  getCurrentSessionFallbackKey
} from '@/config/demo'
import { apiRequest } from '@/utils/api'
import type { CreateReviewDTO, Review } from '@/types/review'

const REVIEWS_TIMEOUT_MS = 8000
const fallbackReviewsByKey = new Map<string, Review[]>()

function cloneReview(review: Review): Review {
  return {
    ...review,
    createdAt: new Date(review.createdAt),
    updatedAt: new Date(review.updatedAt)
  }
}

function getFallbackReviewStore() {
  const key = getCurrentSessionFallbackKey()
  const existing = fallbackReviewsByKey.get(key)
  if (existing) {
    return existing
  }

  const initialReviews =
    key === DEMO_ACCOUNT.email ? createDemoReviews().map(cloneReview) : []
  fallbackReviewsByKey.set(key, initialReviews)
  return initialReviews
}

function normalizeReview(review: Omit<Review, 'createdAt' | 'updatedAt'> & { createdAt: Date | string; updatedAt: Date | string }): Review {
  return {
    ...review,
    createdAt: new Date(review.createdAt),
    updatedAt: new Date(review.updatedAt)
  }
}

class ReviewService {
  getFallbackReviews(): Review[] {
    return getFallbackReviewStore().map(cloneReview)
  }

  async getReviews(): Promise<Review[]> {
    const key = getCurrentSessionFallbackKey()

    try {
      const reviews = await apiRequest<Array<Omit<Review, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string }>>('/reviews', {
        timeoutMs: REVIEWS_TIMEOUT_MS
      })
      const normalized = reviews.map(normalizeReview)
      fallbackReviewsByKey.set(key, normalized.map(cloneReview))
      return normalized.map(cloneReview)
    } catch (error) {
      console.error('Error fetching reviews:', error)
      return this.getFallbackReviews()
    }
  }

  async upsertReview(data: CreateReviewDTO): Promise<Review> {
    try {
      const review = await apiRequest<Omit<Review, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string }>('/reviews', {
        method: 'POST',
        body: data,
        timeoutMs: REVIEWS_TIMEOUT_MS
      })

      const normalized = normalizeReview(review)
      const fallbackReviews = getFallbackReviewStore()
      const existingIndex = fallbackReviews.findIndex(item => item.reservationId === normalized.reservationId)

      if (existingIndex >= 0) {
        fallbackReviews.splice(existingIndex, 1, cloneReview(normalized))
      } else {
        fallbackReviews.unshift(cloneReview(normalized))
      }

      return cloneReview(normalized)
    } catch (error) {
      console.error('Error saving review:', error)
      throw error
    }
  }
}

export default new ReviewService()
