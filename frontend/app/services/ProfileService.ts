import {
  createDemoProfile,
  createUnavailablePaymentMethod,
  getCurrentSessionFallbackKey,
  isDemoUserEmail
} from '@/config/demo'
import { apiRequest } from '@/utils/api'
import { readStoredSession } from '@/utils/authStorage'
import ReservationService from '@/services/ReservationService'
import type {
  PaymentMethodSummary,
  StripeCheckoutSessionResponse,
  UserProfile
} from '@/types/profile'

const PROFILE_TIMEOUT_MS = 10000
const PAYMENT_METHOD_TIMEOUT_MS = 10000
const CHECKOUT_TIMEOUT_MS = 12000

const fallbackProfilesByKey = new Map<string, UserProfile>()
const fallbackPaymentsByKey = new Map<string, PaymentMethodSummary>()
const profileRequestsByKey = new Map<string, Promise<UserProfile>>()
const paymentMethodRequestsByKey = new Map<string, Promise<PaymentMethodSummary>>()

function cloneProfile(profile: UserProfile): UserProfile {
  return { ...profile }
}

function clonePayment(payment: PaymentMethodSummary): PaymentMethodSummary {
  return {
    ...payment,
    card: payment.card ? { ...payment.card } : null
  }
}

function createFallbackProfileForCurrentSession(): UserProfile {
  const session = readStoredSession()
  const demoProfile = createDemoProfile()

  if (!session) {
    return demoProfile
  }

  const isDemoUser = isDemoUserEmail(session.user.email)

  return {
    ...demoProfile,
    id: session.user.id,
    fullName: session.user.fullName,
    email: session.user.email,
    phone: session.user.phone ?? demoProfile.phone,
    membershipLabel: isDemoUser ? demoProfile.membershipLabel : 'Client',
    verified: isDemoUser ? demoProfile.verified : true,
    memberSince: isDemoUser ? demoProfile.memberSince : new Date().toISOString().slice(0, 10),
    preferredGarage: isDemoUser ? demoProfile.preferredGarage : 'Garage Montreal Centre',
    defaultVehicleLabel: isDemoUser ? demoProfile.defaultVehicleLabel : 'Aucun vehicule',
    appointmentCount: isDemoUser ? demoProfile.appointmentCount : 0,
    vehicleCount: isDemoUser ? demoProfile.vehicleCount : 0,
    loyaltyPoints: isDemoUser ? demoProfile.loyaltyPoints : 0,
    addressLine: isDemoUser ? demoProfile.addressLine : 'Adresse a completer',
    city: isDemoUser ? demoProfile.city : 'Montreal, QC',
    notes: isDemoUser ? demoProfile.notes : 'Compte client connecte via authentification backend.'
  }
}

function getFallbackProfileStore() {
  const key = getCurrentSessionFallbackKey()
  const existing = fallbackProfilesByKey.get(key)

  if (existing) {
    const session = readStoredSession()
    if (!session) {
      return existing
    }

    const synchronized = {
      ...existing,
      id: session.user.id,
      fullName: session.user.fullName,
      email: session.user.email,
      phone: session.user.phone ?? existing.phone
    }
    fallbackProfilesByKey.set(key, synchronized)
    return synchronized
  }

  const initialProfile = createFallbackProfileForCurrentSession()
  fallbackProfilesByKey.set(key, initialProfile)
  return initialProfile
}

function getFallbackPaymentStore() {
  const key = getCurrentSessionFallbackKey()
  const existing = fallbackPaymentsByKey.get(key)
  if (existing) {
    return existing
  }

  const initialPayment = createUnavailablePaymentMethod()
  fallbackPaymentsByKey.set(key, initialPayment)
  return initialPayment
}

async function syncAppointmentCount(profile: UserProfile): Promise<UserProfile> {
  if (profile.appointmentCount > 0) {
    return cloneProfile(profile)
  }

  try {
    const reservations = await ReservationService.getMyReservations()
    if (reservations.length === 0) {
      return cloneProfile(profile)
    }

    return {
      ...profile,
      appointmentCount: reservations.length
    }
  } catch (error) {
    console.warn('Error syncing profile appointment count:', error)
    return cloneProfile(profile)
  }
}

class ProfileService {
  getFallbackProfile(): UserProfile {
    return cloneProfile(getFallbackProfileStore())
  }

  getFallbackPaymentMethod(): PaymentMethodSummary {
    return clonePayment(getFallbackPaymentStore())
  }

  async getProfile(): Promise<UserProfile> {
    const key = getCurrentSessionFallbackKey()
    const existingRequest = profileRequestsByKey.get(key)
    if (existingRequest) {
      return existingRequest.then(cloneProfile)
    }

    const request = (async () => {
      try {
        const profile = await apiRequest<UserProfile>('/profile', { timeoutMs: PROFILE_TIMEOUT_MS })
        const synchronizedProfile = await syncAppointmentCount(profile)
        fallbackProfilesByKey.set(key, cloneProfile(synchronizedProfile))
        return cloneProfile(synchronizedProfile)
      } catch (error) {
        console.warn('Error fetching profile:', error)
        return this.getFallbackProfile()
      } finally {
        profileRequestsByKey.delete(key)
      }
    })()

    profileRequestsByKey.set(key, request)
    return request.then(cloneProfile)
  }

  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const key = getCurrentSessionFallbackKey()

    try {
      const profile = await apiRequest<UserProfile>('/profile', {
        method: 'PUT',
        body: data,
        timeoutMs: PROFILE_TIMEOUT_MS
      })
      fallbackProfilesByKey.set(key, cloneProfile(profile))
      return cloneProfile(profile)
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }

  async getPaymentMethod(): Promise<PaymentMethodSummary> {
    const key = getCurrentSessionFallbackKey()
    const existingRequest = paymentMethodRequestsByKey.get(key)
    if (existingRequest) {
      return existingRequest.then(clonePayment)
    }

    const request = (async () => {
      try {
        const paymentMethod = await apiRequest<PaymentMethodSummary>('/profile/payment-method', {
          timeoutMs: PAYMENT_METHOD_TIMEOUT_MS
        })
        const synchronizedPayment = clonePayment({
          ...paymentMethod,
          backendReachable: true
        })
        fallbackPaymentsByKey.set(key, synchronizedPayment)
        return clonePayment(synchronizedPayment)
      } catch (error) {
        console.error('Error fetching payment method:', error)
        const fallbackPayment = {
          ...getFallbackPaymentStore(),
          backendReachable: false,
          message: 'Le backend de paiement est indisponible. Demarrez le serveur sur le port 3000 puis rafraichissez.'
        }
        fallbackPaymentsByKey.set(key, fallbackPayment)
        return clonePayment(fallbackPayment)
      } finally {
        paymentMethodRequestsByKey.delete(key)
      }
    })()

    paymentMethodRequestsByKey.set(key, request)
    return request.then(clonePayment)
  }

  async createStripeCheckoutSession(): Promise<StripeCheckoutSessionResponse> {
    const key = getCurrentSessionFallbackKey()
    const session = await apiRequest<StripeCheckoutSessionResponse>(
      '/profile/payment-method/checkout-session',
      {
        method: 'POST',
        body: {},
        timeoutMs: CHECKOUT_TIMEOUT_MS
      }
    )

    fallbackPaymentsByKey.set(key, {
      ...getFallbackPaymentStore(),
      backendReachable: true,
      status: 'pending',
      lastCheckoutSessionId: session.sessionId,
      message: 'Session Stripe ouverte. Revenez ensuite synchroniser le moyen de paiement.'
    })

    return session
  }

  async syncStripePaymentMethod(sessionId?: string): Promise<PaymentMethodSummary> {
    const key = getCurrentSessionFallbackKey()
    const currentFallback = getFallbackPaymentStore()

    try {
      const paymentMethod = await apiRequest<PaymentMethodSummary>('/profile/payment-method/sync', {
        method: 'POST',
        body: {
          sessionId: sessionId ?? currentFallback.lastCheckoutSessionId
        },
        timeoutMs: PAYMENT_METHOD_TIMEOUT_MS
      })

      fallbackPaymentsByKey.set(key, clonePayment(paymentMethod))
      return clonePayment(paymentMethod)
    } catch (error) {
      console.error('Error syncing Stripe payment method:', error)
      const fallbackPayment = {
        ...currentFallback,
        backendReachable: false,
        message: 'Le backend de paiement est indisponible. Demarrez le serveur sur le port 3000 puis rafraichissez.'
      }
      fallbackPaymentsByKey.set(key, fallbackPayment)
      return clonePayment(fallbackPayment)
    }
  }
}

export default new ProfileService()
