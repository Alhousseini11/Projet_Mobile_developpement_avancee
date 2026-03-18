import { apiRequest } from '@/utils/api'
import { readStoredSession } from '@/utils/authStorage'
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

let fallbackProfileState: UserProfile = { ...MOCK_PROFILE }
let fallbackPaymentState: PaymentMethodSummary = { ...MOCK_PAYMENT_METHOD }

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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    promise
      .then(value => {
        clearTimeout(timeoutId)
        resolve(value)
      })
      .catch(error => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
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
    try {
      const profile = await withTimeout(apiRequest<UserProfile>('/profile'), 1500)
      fallbackProfileState = cloneProfile(profile)
      return cloneProfile(profile)
    } catch (error) {
      console.error('Error fetching profile:', error)
      return this.getFallbackProfile()
    }
  }

  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const profile = await withTimeout(
        apiRequest<UserProfile>('/profile', {
          method: 'PUT',
          body: data
        }),
        1500
      )
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
    try {
      const paymentMethod = await withTimeout(
        apiRequest<PaymentMethodSummary>('/profile/payment-method'),
        1500
      )
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
    }
  }

  async createStripeCheckoutSession(): Promise<StripeCheckoutSessionResponse> {
    const session = await withTimeout(
      apiRequest<StripeCheckoutSessionResponse>('/profile/payment-method/checkout-session', {
        method: 'POST',
        body: {}
      }),
      4000
    )

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
      const paymentMethod = await withTimeout(
        apiRequest<PaymentMethodSummary>('/profile/payment-method/sync', {
          method: 'POST',
          body: {
            sessionId: sessionId ?? fallbackPaymentState.lastCheckoutSessionId
          }
        }),
        4000
      )

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
