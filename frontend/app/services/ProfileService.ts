import { apiRequest } from '@/utils/api'
import { readStoredSession } from '@/utils/authStorage'
import ReservationService from '@/services/ReservationService'
import type {
  PaymentMethodSummary,
  StripeCheckoutSessionResponse,
  UserProfile
} from '@/types/profile'

const MOCK_PROFILE: UserProfile = {
  id: 'demo-user',
  fullName: 'Alex Martin',
  email: 'alex.martin@example.com',
  phone: '+1 514 555 0142',
  membershipLabel: 'Client premium',
  verified: true,
  memberSince: '2024-01-12',
  preferredGarage: 'Garage Montreal Centre',
  defaultVehicleLabel: 'Peugeot 208 GT',
  appointmentCount: 2,
  vehicleCount: 1,
  loyaltyPoints: 240,
  addressLine: '245 Rue du Centre',
  city: 'Montreal, QC',
  notes: 'Preference pour les interventions en semaine le matin.'
}

const MOCK_PAYMENT_METHOD: PaymentMethodSummary = {
  provider: 'stripe',
  status: 'not_configured',
  backendReachable: false,
  stripeConfigured: false,
  customerId: null,
  card: null,
  lastCheckoutSessionId: null,
  lastSyncAt: null,
  message: 'Le backend de paiement est indisponible. Demarrez le serveur sur le port 3000 puis rafraichissez.'
}

const PROFILE_TIMEOUT_MS = 10000
const PAYMENT_METHOD_TIMEOUT_MS = 10000
const CHECKOUT_TIMEOUT_MS = 12000

let fallbackProfileState: UserProfile = { ...MOCK_PROFILE }
let fallbackPaymentState: PaymentMethodSummary = { ...MOCK_PAYMENT_METHOD }
let profileRequest: Promise<UserProfile> | null = null
let paymentMethodRequest: Promise<PaymentMethodSummary> | null = null

function syncFallbackProfileIdentity() {
  const session = readStoredSession()
  if (!session) {
    return
  }

  fallbackProfileState = {
    ...fallbackProfileState,
    id: session.user.id,
    fullName: session.user.fullName,
    email: session.user.email,
    phone: session.user.phone ?? fallbackProfileState.phone
  }
}

function cloneProfile(profile: UserProfile): UserProfile {
  return { ...profile }
}

function clonePayment(payment: PaymentMethodSummary): PaymentMethodSummary {
  return {
    ...payment,
    card: payment.card ? { ...payment.card } : null
  }
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
    syncFallbackProfileIdentity()
    return cloneProfile(fallbackProfileState)
  }

  getFallbackPaymentMethod(): PaymentMethodSummary {
    return clonePayment(fallbackPaymentState)
  }

  async getProfile(): Promise<UserProfile> {
    syncFallbackProfileIdentity()
    if (profileRequest) {
      return profileRequest.then(cloneProfile)
    }

    profileRequest = (async () => {
      try {
        const profile = await apiRequest<UserProfile>('/profile', { timeoutMs: PROFILE_TIMEOUT_MS })
        const synchronizedProfile = await syncAppointmentCount(profile)
        fallbackProfileState = cloneProfile(synchronizedProfile)
        return cloneProfile(synchronizedProfile)
      } catch (error) {
        console.warn('Error fetching profile:', error)
        return this.getFallbackProfile()
      } finally {
        profileRequest = null
      }
    })()

    return profileRequest.then(cloneProfile)
  }

  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const profile = await apiRequest<UserProfile>('/profile', {
        method: 'PUT',
        body: data,
        timeoutMs: PROFILE_TIMEOUT_MS
      })
      fallbackProfileState = cloneProfile(profile)
      return cloneProfile(profile)
    } catch (error) {
      console.error('Error updating profile:', error)
      fallbackProfileState = {
        ...fallbackProfileState,
        ...data
      }
      return this.getFallbackProfile()
    }
  }

  async getPaymentMethod(): Promise<PaymentMethodSummary> {
    if (paymentMethodRequest) {
      return paymentMethodRequest.then(clonePayment)
    }

    paymentMethodRequest = (async () => {
      try {
        const paymentMethod = await apiRequest<PaymentMethodSummary>('/profile/payment-method', {
          timeoutMs: PAYMENT_METHOD_TIMEOUT_MS
        })
        fallbackPaymentState = clonePayment({
          ...paymentMethod,
          backendReachable: true
        })
        return clonePayment(fallbackPaymentState)
      } catch (error) {
        console.error('Error fetching payment method:', error)
        fallbackPaymentState = {
          ...fallbackPaymentState,
          backendReachable: false,
          message: 'Le backend de paiement est indisponible. Demarrez le serveur sur le port 3000 puis rafraichissez.'
        }
        return this.getFallbackPaymentMethod()
      } finally {
        paymentMethodRequest = null
      }
    })()

    return paymentMethodRequest.then(clonePayment)
  }

  async createStripeCheckoutSession(): Promise<StripeCheckoutSessionResponse> {
      const session = await apiRequest<StripeCheckoutSessionResponse>('/profile/payment-method/checkout-session', {
      method: 'POST',
      body: {},
      timeoutMs: CHECKOUT_TIMEOUT_MS
    })

    fallbackPaymentState = {
      ...fallbackPaymentState,
      backendReachable: true,
      status: 'pending',
      lastCheckoutSessionId: session.sessionId,
      message: 'Session Stripe ouverte. Revenez ensuite synchroniser le moyen de paiement.'
    }

    return session
  }

  async syncStripePaymentMethod(sessionId?: string): Promise<PaymentMethodSummary> {
    try {
      const paymentMethod = await apiRequest<PaymentMethodSummary>('/profile/payment-method/sync', {
        method: 'POST',
        body: {
          sessionId: sessionId ?? fallbackPaymentState.lastCheckoutSessionId
        },
        timeoutMs: PAYMENT_METHOD_TIMEOUT_MS
      })

      fallbackPaymentState = clonePayment(paymentMethod)
      return clonePayment(paymentMethod)
    } catch (error) {
      console.error('Error syncing Stripe payment method:', error)
      fallbackPaymentState = {
        ...fallbackPaymentState,
        backendReachable: false,
        message: 'Le backend de paiement est indisponible. Demarrez le serveur sur le port 3000 puis rafraichissez.'
      }
      return this.getFallbackPaymentMethod()
    }
  }
}

export default new ProfileService()
