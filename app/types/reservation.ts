/**
 * TYPES POUR LES RÉSERVATIONS
 */

export interface ContactInfo {
  name: string
  phone: string
  email: string
  useProfileData: boolean
}

export interface PaymentInfo {
  method: 'garage' | 'online'
  cardNumber?: string
  expiry?: string
  cvv?: string
}

export interface ReservationData {
  service: string
  selectedDate: Date
  selectedTime: string
  vehicleId: string
  contact: ContactInfo
  payment: PaymentInfo
}

export interface Reservation extends ReservationData {
  id: string
  userId: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  createdAt: Date
  updatedAt: Date
}

export interface Vehicle {
  id: string
  name: string
  model: string
  year: number
  mileage: number
}

// API Request/Response Types
export interface CreateReservationRequest {
  service: string
  selectedDate: string
  selectedTime: string
  vehicleId: string
  contact: ContactInfo
  payment: PaymentInfo
}

export interface CreateReservationResponse {
  success: boolean
  reservation: Reservation
  message: string
}

export interface GetReservationsResponse {
  reservations: Reservation[]
  total: number
}

export interface ProcessPaymentRequest {
  amount: number
  currency: string
  reservationId: string
  method: 'garage' | 'online'
  cardToken?: string
}

export interface ProcessPaymentResponse {
  success: boolean
  transactionId: string
  status: 'completed' | 'pending' | 'failed'
}

// Constants
export const RESERVATION_SERVICES = {
  OIL_CHANGE: 'oil_change',
  BRAKES: 'brakes',
  BATTERY: 'battery'
} as const

export const SERVICE_NAMES: Record<string, string> = {
  'oil_change': 'Vidange d\'huile',
  'brakes': 'Freins',
  'battery': 'Batterie'
}

export const TIME_SLOTS = ['16:30', '17:00', '18:00', '20:30', '22:00', '24:00']
export const SERVICE_PRICE = 25.00

export const PAYMENT_METHODS = {
  GARAGE: 'garage',
  ONLINE: 'online'
} as const

export const RESERVATION_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const
