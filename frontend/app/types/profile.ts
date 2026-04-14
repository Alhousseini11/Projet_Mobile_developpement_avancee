export interface UserProfile {
  id: string
  fullName: string
  email: string
  phone: string
  membershipLabel: string
  verified: boolean
  memberSince: string
  preferredGarage: string
  defaultVehicleLabel: string
  appointmentCount: number
  vehicleCount: number
  loyaltyPoints: number
  addressLine: string
  city: string
  notes: string
}

export interface ProfileUpdatePayload {
  fullName: string
  email: string
  phone: string
  addressLine: string
  city: string
  preferredGarage: string
  notes: string
}

export type PaymentMethodStatus = 'not_configured' | 'pending' | 'ready'

export interface PaymentMethodCard {
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

export interface PaymentMethodSummary {
  provider: 'stripe'
  status: PaymentMethodStatus
  backendReachable: boolean
  stripeConfigured: boolean
  customerId: string | null
  card: PaymentMethodCard | null
  lastCheckoutSessionId: string | null
  lastSyncAt: string | null
  message: string
}

export interface StripeCheckoutSessionResponse {
  sessionId: string
  url: string
  mode: 'setup'
}
