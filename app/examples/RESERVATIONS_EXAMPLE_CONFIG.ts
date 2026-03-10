/**
 * RESERVATIONS INTEGRATION GUIDE - EXAMPLE
 * 
 * Documentation complète disponible à:
 * - app/components/RESERVATIONS_GUIDE.md (détails des 8 étapes)
 * - RESERVATIONS_INTEGRATION_GUIDE.md (guide d'intégration backend)
 * 
 * Ce fichier contient les données de test et configuration de base.
 */

// Mock Data
export const mockVehicles = [
  {
    id: '1',
    name: 'Toyota Corolla 2018',
    model: 'Corolla',
    year: 2018,
    mileage: 75000
  },
  {
    id: '2',
    name: 'Renault Clio 2020',
    model: 'Clio',
    year: 2020,
    mileage: 45000
  }
]

// Constants
export const RESERVATION_SERVICES = {
  OIL_CHANGE: 'oil_change',
  BRAKES: 'brakes',
  BATTERY: 'battery'
}

export const SERVICE_NAMES: Record<string, string> = {
  oil_change: 'Vidange d\'huile',
  brakes: 'Freins',
  battery: 'Batterie'
}

export const SERVICE_ICONS: Record<string, string> = {
  oil_change: '🛢️',
  brakes: '🛑',
  battery: '🔋'
}

export const TIME_SLOTS = ['16:30', '17:00', '18:00', '20:30', '22:00', '24:00']
export const SERVICE_PRICE = 25.00 // EUR

export const PAYMENT_METHODS = {
  GARAGE: 'garage',
  ONLINE: 'online'
}

export const RESERVATION_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
}

// API Endpoints
export const API_ENDPOINTS = {
  CREATE_RESERVATION: '/api/reservations',
  GET_RESERVATIONS: '/api/reservations/my-reservations',
  GET_RESERVATION: '/api/reservations/:id',
  CANCEL_RESERVATION: '/api/reservations/:id/cancel',
  GET_AVAILABLE_SLOTS: '/api/reservations/available-slots',
  PROCESS_PAYMENT: '/api/payments/process',
  CREATE_CARD_TOKEN: '/api/payments/create-token'
}

// Validation Rules
export const VALIDATION_RULES = {
  phoneRegex: /^[\d\s+\-()]+$/,
  emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  cardNumberLength: 16,
  cvvLength: 3
}

// Error Messages
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'Ce champ est obligatoire',
  INVALID_EMAIL: 'Email invalide',
  INVALID_PHONE: 'Numéro de téléphone invalide',
  INVALID_CARD: 'Numéro de carte invalide',
  RESERVATION_FAILED: 'Erreur lors de la création de la réservation',
  PAYMENT_FAILED: 'Erreur lors du traitement du paiement',
  SLOT_UNAVAILABLE: 'Ce créneau n\'est plus disponible'
}

// Success Messages
export const SUCCESS_MESSAGES = {
  RESERVATION_CREATED: 'Réservation créée avec succès!',
  RESERVATION_CANCELLED: 'Réservation annulée',
  PAYMENT_PROCESSED: 'Paiement traité avec succès'
}

// Configuration
export const CONFIG = {
  API_BASE_URL: 'http://localhost:3000/api',
  STRIPE_PUBLIC_KEY: 'pk_test_...',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3
}
