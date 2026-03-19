import { readStoredSession } from '@/utils/authStorage'
import type { InvoiceSummary } from '@/types/invoice'
import type { PaymentMethodSummary, UserProfile } from '@/types/profile'
import type { Reservation } from '@/types/reservation'
import type { Review } from '@/types/review'
import {
  DocumentType,
  FuelType,
  MaintenanceType,
  type MaintenanceRecord,
  type Vehicle,
  type VehicleDocument,
  type VehicleInsurance,
  VehicleType
} from '@/types/vehicle'

export const DEMO_ACCOUNT = {
  id: 'demo-user',
  fullName: 'Alex Martin',
  email: 'alex.martin@example.com',
  phone: '+1 514 555 0142',
  password: 'Garage123!'
} as const

export function normalizeUserEmail(value?: string | null) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function getCurrentSessionUserEmail() {
  return normalizeUserEmail(readStoredSession()?.user.email)
}

export function getCurrentSessionUserId() {
  const value = readStoredSession()?.user.id?.trim()
  return value || DEMO_ACCOUNT.id
}

export function getCurrentSessionFallbackKey() {
  return getCurrentSessionUserEmail() || getCurrentSessionUserId()
}

export function isDemoUserEmail(value?: string | null) {
  return normalizeUserEmail(value) === DEMO_ACCOUNT.email
}

export function isCurrentSessionDemoUser() {
  return isDemoUserEmail(readStoredSession()?.user.email)
}

export function createDemoProfile(): UserProfile {
  return {
    id: DEMO_ACCOUNT.id,
    fullName: DEMO_ACCOUNT.fullName,
    email: DEMO_ACCOUNT.email,
    phone: DEMO_ACCOUNT.phone,
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
}

export function createUnavailablePaymentMethod(): PaymentMethodSummary {
  return {
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
}

export function createDemoInvoices(): InvoiceSummary[] {
  return [
    {
      id: 'invoice-1001',
      number: 'INV-2026-001',
      serviceLabel: 'Vidange',
      issuedAt: '2026-03-10',
      appointmentDate: '2026-03-18',
      totalAmount: 90.86,
      taxAmount: 11.86,
      currency: 'CAD',
      status: 'paid'
    },
    {
      id: 'invoice-1002',
      number: 'INV-2026-002',
      serviceLabel: 'Diagnostic',
      issuedAt: '2026-03-12',
      appointmentDate: '2026-03-22',
      totalAmount: 67.84,
      taxAmount: 8.84,
      currency: 'CAD',
      status: 'pending'
    }
  ]
}

export function createDemoReservations(): Reservation[] {
  return [
    {
      id: 'reservation-1',
      serviceId: 'oil-change',
      serviceLabel: 'Vidange',
      date: '2026-03-18',
      time: '10:00',
      status: 'confirmed',
      createdAt: new Date('2026-03-10T09:00:00'),
      updatedAt: new Date('2026-03-10T09:00:00')
    },
    {
      id: 'reservation-2',
      serviceId: 'diagnostic',
      serviceLabel: 'Diagnostic',
      date: '2026-03-22',
      time: '15:30',
      status: 'pending',
      createdAt: new Date('2026-03-12T14:15:00'),
      updatedAt: new Date('2026-03-12T14:15:00')
    }
  ]
}

export function createDemoReviews(): Review[] {
  return [
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
}

export function createDemoVehicles(): Vehicle[] {
  return [
    {
      id: '1',
      userId: DEMO_ACCOUNT.id,
      name: 'Toyota Corolla',
      model: 'Corolla 2018',
      year: 2018,
      mileage: 75000,
      type: VehicleType.SEDAN,
      licensePlate: 'AB-123-CD',
      fuelType: FuelType.PETROL,
      color: 'Gris',
      createdAt: new Date('2023-01-15'),
      updatedAt: new Date('2024-01-10')
    },
    {
      id: '2',
      userId: DEMO_ACCOUNT.id,
      name: 'Renault Clio',
      model: 'Clio 2020',
      year: 2020,
      mileage: 45000,
      type: VehicleType.SEDAN,
      licensePlate: 'EF-456-GH',
      fuelType: FuelType.DIESEL,
      color: 'Bleu',
      createdAt: new Date('2023-06-20'),
      updatedAt: new Date('2024-02-15')
    }
  ]
}

export function createDemoMaintenanceHistory(): MaintenanceRecord[] {
  return [
    {
      id: 'm-1',
      vehicleId: '1',
      type: MaintenanceType.OIL_CHANGE,
      description: 'Vidange complete',
      mileage: 70000,
      cost: 89.9,
      date: new Date('2024-01-05'),
      nextMaintenanceKm: 80000,
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-05')
    }
  ]
}

export function createDemoVehicleDocuments(): VehicleDocument[] {
  return [
    {
      id: 'd-1',
      vehicleId: '1',
      type: DocumentType.REGISTRATION,
      title: 'Carte grise',
      fileUrl: 'https://example.com/documents/registration.pdf',
      uploadedAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-05')
    }
  ]
}

export function createDemoVehicleInsurance(): VehicleInsurance[] {
  return [
    {
      id: 'i-1',
      vehicleId: '1',
      provider: 'AssureAuto',
      policyNumber: 'POL-12345',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      coverage: 'Tous risques',
      phoneNumber: '+33 1 23 45 67 89',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  ]
}
