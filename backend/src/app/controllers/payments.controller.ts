/**
 * PAYMENTS CONTROLLER
 * Handles payment processing and Stripe integration
 */

import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { logger } from '../../config/logger'

// Mock Stripe - in production, import and use actual Stripe SDK
// import Stripe from 'stripe'
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' })

const prisma = new PrismaClient()

export class PaymentsController {
  /**
   * Process a payment
   * POST /api/payments/process
   */
  static async processPayment(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id
      const { reservationId, paymentMethod, amount, cardToken } = req.body

      if (!reservationId || !paymentMethod || !amount) {
        return res.status(400).json({
          error: 'Missing required fields',
        })
      }

      // Verify reservation exists and belongs to user
      const reservation = await prisma.reservation.findUnique({
        where: { id: reservationId },
      })

      if (!reservation || reservation.userId !== userId) {
        return res.status(404).json({
          error: 'Reservation not found',
        })
      }

      let transaction: any = null

      if (paymentMethod === 'ONLINE_PAYMENT') {
        // Process with Stripe (mock implementation)
        if (!cardToken) {
          return res.status(400).json({
            error: 'Card token is required for online payment',
          })
        }

        // TODO: Implement actual Stripe payment processing
        // const paymentIntent = await stripe.paymentIntents.create({
        //   amount: Math.round(amount * 100),
        //   currency: 'eur',
        //   source: cardToken,
        //   description: `Reservation ${reservationId}`,
        // })

        transaction = {
          id: `txn_${Date.now()}`, // Mock transaction ID
          status: 'COMPLETED',
          amount,
          method: 'STRIPE',
          timestamp: new Date(),
        }
      } else if (paymentMethod === 'GARAGE_PAYMENT') {
        // Mark as pending for garage payment
        transaction = {
          id: `garage_${Date.now()}`,
          status: 'PENDING',
          amount,
          method: 'GARAGE_CASH',
          timestamp: new Date(),
        }
      }

      // Update reservation payment status
      const updatedReservation = await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          paymentStatus: paymentMethod === 'ONLINE_PAYMENT' ? 'COMPLETED' : 'PENDING',
          paymentMethod,
        },
      })

      logger.info(`Payment processed: ${reservationId} - ${transaction?.status}`)

      return res.status(201).json({
        success: true,
        message: `Payment ${transaction?.status.toLowerCase()}`,
        transaction,
        reservation: updatedReservation,
      })
    } catch (error: unknown) {
      logger.error('Error processing payment')
      return res.status(500).json({
        error: 'Failed to process payment',
      })
    }
  }

  /**
   * Create a Stripe card token
   * POST /api/payments/create-token
   */
  static async createCardToken(req: Request, res: Response) {
    try {
      const { cardNumber, expMonth, expYear, cvc } = req.body

      if (!cardNumber || !expMonth || !expYear || !cvc) {
        return res.status(400).json({
          error: 'Card details are required',
        })
      }

      // TODO: Implement actual Stripe token creation
      // const token = await stripe.tokens.create({
      //   card: {
      //     number: cardNumber,
      //     exp_month: expMonth,
      //     exp_year: expYear,
      //     cvc: cvc,
      //   },
      // })

      // Mock token response
      const mockToken = `tok_visa_${Date.now()}`

      return res.status(201).json({
        success: true,
        token: mockToken,
        message: 'Card token created successfully',
      })
    } catch (error: unknown) {
      logger.error('Error creating card token')
      return res.status(500).json({
        error: 'Failed to create card token',
      })
    }
  }

  /**
   * Check payment status
   * GET /api/payments/status/:transactionId
   */
  static async checkPaymentStatus(req: Request, res: Response) {
    try {
      const { transactionId } = req.params

      // TODO: Query actual transaction from Stripe
      // const paymentIntent = await stripe.paymentIntents.retrieve(transactionId)

      // Mock response
      const mockStatus = {
        transactionId,
        status: 'COMPLETED',
        amount: 25.0,
        currency: 'EUR',
        timestamp: new Date(),
      }

      return res.json({
        success: true,
        payment: mockStatus,
      })
    } catch (error: unknown) {
      logger.error('Error checking payment status')
      return res.status(500).json({
        error: 'Failed to check payment status',
      })
    }
  }

  /**
   * Get Stripe public key
   * GET /api/payments/stripe-key
   */
  static async getStripePublicKey(req: Request, res: Response) {
    try {
      const publicKey = process.env.STRIPE_PUBLIC_KEY || 'pk_test_mock'

      return res.json({
        success: true,
        publicKey,
      })
    } catch (error: unknown) {
      logger.error('Error fetching Stripe key')
      return res.status(500).json({
        error: 'Failed to fetch Stripe key',
      })
    }
  }

  /**
   * Get user's payment history
   * GET /api/payments/my-payments
   */
  static async getUserPayments(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id

      // Get all completed reservations with payment info
      const payments = await prisma.reservation.findMany({
        where: {
          userId,
          paymentStatus: {
            in: ['COMPLETED', 'REFUNDED'],
          },
        },
        select: {
          id: true,
          customerName: true,
          totalPrice: true,
          paymentStatus: true,
          paymentMethod: true,
          reservationDate: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return res.json({
        success: true,
        payments,
      })
    } catch (error: unknown) {
      logger.error('Error fetching user payments')
      return res.status(500).json({
        error: 'Failed to fetch payments',
      })
    }
  }

  /**
   * Refund a payment (admin only)
   * POST /api/payments/refund/:transactionId
   */
  static async refundPayment(req: Request, res: Response) {
    try {
      const { transactionId } = req.params
      const { reason } = req.body

      // TODO: Implement actual Stripe refund
      // await stripe.refunds.create({
      //   payment_intent: transactionId,
      // })

      // Mock refund response
      const refund = {
        transactionId,
        status: 'REFUNDED',
        reason: reason || 'No reason provided',
        timestamp: new Date(),
      }

      logger.info(`Payment refunded: ${transactionId}`)

      return res.json({
        success: true,
        message: 'Payment refunded successfully',
        refund,
      })
    } catch (error: unknown) {
      logger.error('Error refunding payment')
      return res.status(500).json({
        error: 'Failed to refund payment',
      })
    }
  }
}
