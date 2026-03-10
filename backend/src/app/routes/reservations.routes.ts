/**
 * RESERVATIONS ROUTES
 * Defines all reservation endpoints
 */

import { Router } from 'express'
import { ReservationsController } from '../controllers/reservations.controller'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'

const router = Router()

// Apply auth guard to all routes
router.use(authGuard)

// ==========================================
// CLIENT ROUTES
// ==========================================

/**
 * @route POST /api/reservations
 * @desc Create a new reservation
 * @access Private (User)
 */
router.post('/', ReservationsController.createReservation)

/**
 * @route GET /api/reservations/my-reservations
 * @desc Get all reservations for the logged-in user
 * @access Private (User)
 */
router.get('/my-reservations', ReservationsController.getUserReservations)

/**
 * @route GET /api/reservations/available-slots?date=YYYY-MM-DD&service=SERVICE
 * @desc Get available time slots for a specific date and service
 * @access Private (User)
 */
router.get('/available-slots', ReservationsController.getAvailableSlots)

/**
 * @route GET /api/reservations/:id
 * @desc Get a specific reservation by ID
 * @access Private (User)
 */
router.get('/:id', ReservationsController.getReservation)

/**
 * @route PUT /api/reservations/:id/cancel
 * @desc Cancel a reservation
 * @access Private (User)
 */
router.put('/:id/cancel', ReservationsController.cancelReservation)

// ==========================================
// ADMIN ROUTES
// ==========================================

// Apply additional role guard for admin routes
router.use(roleGuard(['ADMIN', 'MECHANIC']))

/**
 * @route GET /api/reservations
 * @desc Get all reservations (admin only)
 * @access Private (Admin)
 */
router.get('/', ReservationsController.getAllReservations)

/**
 * @route PUT /api/reservations/:id
 * @desc Update a reservation (admin only)
 * @access Private (Admin)
 */
router.put('/:id', ReservationsController.updateReservation)

/**
 * @route DELETE /api/reservations/:id
 * @desc Delete a reservation (admin only)
 * @access Private (Admin)
 */
router.delete('/:id', ReservationsController.deleteReservation)

/**
 * @route PUT /api/reservations/:id/assign
 * @desc Assign a mechanic to a reservation (admin only)
 * @access Private (Admin)
 */
router.put('/:id/assign', ReservationsController.assignMechanic)

export default router
