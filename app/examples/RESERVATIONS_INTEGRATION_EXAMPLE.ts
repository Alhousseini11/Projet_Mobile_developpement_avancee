/**
 * RESERVATIONS INTEGRATION EXAMPLE
 * 
 * Ce fichier contient les définitions de types pour l'intégration
 * des réservations. Voir RESERVATIONS_INTEGRATION_GUIDE.md pour
 * l'implémentation complète.
 */

// Exemple de données de test
export const EXAMPLE_VEHICLE = {
  id: '1',
  name: 'Toyota Corolla 2018',
  model: 'Corolla',
  year: 2018,
  mileage: 75000
}

export const EXAMPLE_RESERVATION_DATA = {
  service: 'oil_change',
  selectedDate: new Date('2026-03-15'),
  selectedTime: '17:00',
  vehicleId: '1',
  contact: {
    name: 'Alex Dupont',
    phone: '06 33 33 73 43',
    email: 'alex@example.com',
    useProfileData: false
  },
  payment: {
    method: 'garage',
    cardNumber: undefined,
    expiry: undefined,
    cvv: undefined
  }
}

export const TIME_SLOTS = ['16:30', '17:00', '18:00', '20:30', '22:00', '24:00']

export const SERVICES = {
  OIL_CHANGE: 'oil_change',
  BRAKES: 'brakes',
  BATTERY: 'battery'
}

export const SERVICE_NAMES = {
  oil_change: 'Vidange d\'huile',
  brakes: 'Freins',
  battery: 'Batterie'
}

// Documentation: Voir RESERVATIONS_INTEGRATION_GUIDE.md
export const INTEGRATION_STEPS = [
  '1. Créer ReservationService (app/services/ReservationService.ts)',
  '2. Créer PaymentService (app/services/PaymentService.ts)',
  '3. Créer routes backend (backend/src/routes/reservations.routes.ts)',
  '4. Créer contrôleur backend (backend/src/controllers/reservations.controller.ts)',
  '5. Mettre à jour prisma/schema.prisma avec model Reservation',
  '6. Exécuter migrations: npx prisma migrate dev --name add_reservations',
  '7. Configurer variables d\'environnement (.env)',
  '8. Tester l\'intégration complète'
]

export const integrationType = 'RESERVATIONS'
export const status = 'Frontend: ✅ 100% | Backend: ⏳ TODO'


// ==========================================
// 4. STRUCTURE DU BACKEND (TypeScript)
// ==========================================
// 
// backend/src/routes/reservations.routes.ts
/*
import express from 'express'
import { ReservationsController } from '../controllers/reservations.controller'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'

const router = express.Router()

// Toutes les routes nécessitent l'authentification
router.use(authGuard)

// Routes publiques (client)
router.post('/', ReservationsController.createReservation)
router.get('/my-reservations', ReservationsController.getUserReservations)
router.get('/:id', ReservationsController.getReservation)
router.get('/available-slots', ReservationsController.getAvailableSlots)
router.put('/:id/cancel', ReservationsController.cancelReservation)

// Routes admin
router.use(roleGuard(['admin', 'garage-manager']))
router.get('/', ReservationsController.getAllReservations)
router.put('/:id', ReservationsController.updateReservation)
router.delete('/:id', ReservationsController.deleteReservation)

export default router
*/

