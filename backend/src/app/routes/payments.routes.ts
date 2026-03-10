/**
 * PAYMENTS ROUTES
 * Defines all payment endpoints for Stripe integration
 */

import { Router } from 'express'
import { PaymentsController } from '../controllers/payments.controller'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'

const router = Router()

// Apply auth guard to all routes
router.use(authGuard)

/**
 * @route POST /api/payments/process
 * @desc Process a payment (garage or online)
 * @access Private (User)
 */
router.post('/process', PaymentsController.processPayment)

/**
 * @route POST /api/payments/create-token
 * @desc Create a Stripe token for a card
 * @access Private (User)
 */
router.post('/create-token', PaymentsController.createCardToken)

/**
 * @route GET /api/payments/status/:transactionId
 * @desc Get payment status
 * @access Private (User)
 */
router.get('/status/:transactionId', PaymentsController.checkPaymentStatus)

/**
 * @route GET /api/payments/stripe-key
 * @desc Get Stripe public key
 * @access Public
 */
router.get('/stripe-key', PaymentsController.getStripePublicKey)

/**
 * @route GET /api/payments/my-payments
 * @desc Get user's payment history
 * @access Private (User)
 */
router.get('/my-payments', PaymentsController.getUserPayments)

/**
 * @route POST /api/payments/refund/:transactionId
 * @desc Refund a payment
 * @access Private (Admin)
 */
router.post('/refund/:transactionId', roleGuard(['ADMIN']), PaymentsController.refundPayment)

export default router
