import { readStoredSession } from '@/utils/authStorage'
import { apiRequest } from '@/utils/api'
import type { CreateReviewDTO, Review } from '@/types/review'

const DEMO_REVIEW_EMAIL = 'alex.martin@example.com'

const DEMO_REVIEWS: Review[] = [
  {
    id: 'review-1',
    reservationId: 'reservation-1',
    reservationLabel: 'Vidange',
    appointmentDate: '2026-03-18',
    rating: 5,
    comment: 'Service rapide, accueil rassurant et explications claires.',
    createdAt: new Date('2026-03-11T10:00:00'),
    updatedAt: new Date('2026-03-11T10:00:00')
  }
]

const REVIEWS_TIMEOUT_MS = 8000
const fallbackReviewsByEmail = new Map<string, Review[]>()

function getReviewFallbackKey() {
  return readStoredSession()?.user.email?.trim().toLowerCase() || DEMO_REVIEW_EMAIL
}

function cloneReview(review: Review): Review {
  return {
    ...review,
    createdAt: new Date(review.createdAt),
    updatedAt: new Date(review.updatedAt)
  }
}

function getFallbackReviewStore() {
  const key = getReviewFallbackKey()
  const existing = fallbackReviewsByEmail.get(key)
  if (existing) {
    return existing
  }

  const initialReviews = key === DEMO_REVIEW_EMAIL ? DEMO_REVIEWS.map(cloneReview) : []
  fallbackReviewsByEmail.set(key, initialReviews)
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
    try {
      const reviews = await apiRequest<Array<Omit<Review, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string }>>('/reviews', {
        timeoutMs: REVIEWS_TIMEOUT_MS
      })
      const normalized = reviews.map(normalizeReview)
      fallbackReviewsByEmail.set(getReviewFallbackKey(), normalized.map(cloneReview))
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
      const fallbackReviews = getFallbackReviewStore()
      const now = new Date()
      const existingIndex = fallbackReviews.findIndex(item => item.reservationId === data.reservationId)
      const fallbackReview: Review = {
        id: existingIndex >= 0 ? fallbackReviews[existingIndex].id : `review-${fallbackReviews.length + 1}`,
        reservationId: data.reservationId,
        reservationLabel: 'Rendez-vous',
        appointmentDate: now.toISOString().slice(0, 10),
        rating: data.rating,
        comment: data.comment?.trim() || null,
        createdAt: existingIndex >= 0 ? fallbackReviews[existingIndex].createdAt : now,
        updatedAt: now
      }

      if (existingIndex >= 0) {
        fallbackReviews.splice(existingIndex, 1, cloneReview(fallbackReview))
      } else {
        fallbackReviews.unshift(cloneReview(fallbackReview))
      }

      return cloneReview(fallbackReview)
    }
  }
}

export default new ReviewService()
