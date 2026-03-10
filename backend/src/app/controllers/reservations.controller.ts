/**
 * RESERVATIONS CONTROLLER
 * Handles all reservation business logic
 */

import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { logger } from '../../config/logger'

const prisma = new PrismaClient()

export class ReservationsController {
  /**
   * Create a new reservation
   * POST /api/reservations
   */
  static async createReservation(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id
      const {
        serviceType,
        reservationDate,
        reservationTime,
        vehicleId,
        newVehicle,
        contactInfo,
        paymentMethod,
        totalPrice,
      } = req.body

      // Validate required fields
      if (
        !serviceType ||
        !reservationDate ||
        !reservationTime ||
        !contactInfo ||
        !paymentMethod
      ) {
        return res.status(400).json({
          error: 'Missing required fields',
        })
      }

      // Get or create vehicle
      let vehicle
      if (vehicleId) {
        vehicle = await prisma.vehicle.findUnique({
          where: { id: vehicleId },
        })
        if (!vehicle || vehicle.userId !== userId) {
          return res.status(404).json({
            error: 'Vehicle not found',
          })
        }
      } else if (newVehicle) {
        vehicle = await prisma.vehicle.create({
          data: {
            userId,
            brand: newVehicle.brand,
            model: newVehicle.model,
            year: newVehicle.year,
            licensePlate: newVehicle.licensePlate,
            color: newVehicle.color,
            mileage: newVehicle.mileage || 0,
            photoUrl: newVehicle.photoUrl,
          },
        })
      } else {
        return res.status(400).json({
          error: 'Vehicle is required',
        })
      }

      // Create reservation
      const reservation = await prisma.reservation.create({
        data: {
          userId,
          vehicleId: vehicle.id,
          serviceType,
          reservationDate: new Date(reservationDate),
          reservationTime,
          status: 'PENDING',
          totalPrice: parseFloat(totalPrice) || 25,
          paymentMethod,
          paymentStatus: 'PENDING',
          customerName: contactInfo.name,
          customerEmail: contactInfo.email,
          customerPhone: contactInfo.phone,
          notes: contactInfo.notes,
        },
        include: {
          vehicle: true,
          user: true,
        },
      })

      logger.info(`Reservation created: ${reservation.id}`)

      return res.status(201).json({
        success: true,
        message: 'Reservation created successfully',
        reservation,
      })
    } catch (error: unknown) {
      logger.error('Error creating reservation')
      return res.status(500).json({
        error: 'Failed to create reservation',
      })
    }
  }

  /**
   * Get all reservations for logged-in user
   * GET /api/reservations/my-reservations
   */
  static async getUserReservations(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id

      const reservations = await prisma.reservation.findMany({
        where: { userId },
        include: {
          vehicle: true,
        },
        orderBy: {
          reservationDate: 'desc',
        },
      })

      return res.json({
        success: true,
        reservations,
      })
    } catch (error: unknown) {
      logger.error('Error fetching user reservations')
      return res.status(500).json({
        error: 'Failed to fetch reservations',
      })
    }
  }

  /**
   * Get available time slots for a date and service
   * GET /api/reservations/available-slots?date=YYYY-MM-DD&service=SERVICE
   */
  static async getAvailableSlots(req: Request, res: Response) {
    try {
      const { date, service } = req.query

      if (!date || !service) {
        return res.status(400).json({
          error: 'Date and service are required',
        })
      }

      // Check if date is a weekend
      const reservationDate = new Date(date as string)
      const dayOfWeek = reservationDate.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

      // Define working hours
      const workingHours = [
        '08:00',
        '09:00',
        '10:00',
        '11:00',
        '13:00',
        '14:00',
        '15:00',
        '16:00',
        '17:00',
      ]

      // Exclude weekends
      if (isWeekend) {
        return res.json({
          availableSlots: [],
          message: 'No availability on weekends',
        })
      }

      // Get booked slots for this date
      const bookedReservations = await prisma.reservation.findMany({
        where: {
          reservationDate: {
            gte: new Date(date as string),
            lt: new Date(new Date(date as string).getTime() + 86400000),
          },
          status: {
            not: 'CANCELLED',
          },
        },
        select: {
          reservationTime: true,
        },
      })

      const bookedTimes = bookedReservations.map((r: any) => r.reservationTime)

      // Filter available slots (max 2 reservations per slot)
      const slotCounts: { [key: string]: number } = {}
      bookedTimes.forEach((time) => {
        slotCounts[time] = (slotCounts[time] || 0) + 1
      })

      const availableSlots = workingHours.filter((time) => (slotCounts[time] || 0) < 2)

      return res.json({
        availableSlots,
        message: 'Available slots fetched successfully',
      })
    } catch (error: unknown) {
      logger.error('Error fetching available slots')
      return res.status(500).json({
        error: 'Failed to fetch available slots',
      })
    }
  }

  /**
   * Get a specific reservation
   * GET /api/reservations/:id
   */
  static async getReservation(req: Request, res: Response) {
    try {
      const { id } = req.params
      const userId = (req as any).user.id

      const reservation = await prisma.reservation.findUnique({
        where: { id },
        include: {
          vehicle: true,
          user: true,
        },
      })

      if (!reservation) {
        return res.status(404).json({
          error: 'Reservation not found',
        })
      }

      // Check authorization
      if (reservation.userId !== userId && (req as any).user.role !== 'ADMIN') {
        return res.status(403).json({
          error: 'Unauthorized',
        })
      }

      return res.json({
        success: true,
        reservation,
      })
    } catch (error: unknown) {
      logger.error('Error fetching reservation')
      return res.status(500).json({
        error: 'Failed to fetch reservation',
      })
    }
  }

  /**
   * Cancel a reservation
   * PUT /api/reservations/:id/cancel
   */
  static async cancelReservation(req: Request, res: Response) {
    try {
      const { id } = req.params
      const userId = (req as any).user.id

      const reservation = await prisma.reservation.findUnique({
        where: { id },
      })

      if (!reservation) {
        return res.status(404).json({
          error: 'Reservation not found',
        })
      }

      // Check authorization
      if (reservation.userId !== userId && (req as any).user.role !== 'ADMIN') {
        return res.status(403).json({
          error: 'Unauthorized',
        })
      }

      // Cannot cancel completed reservations
      if (reservation.status === 'COMPLETED' || reservation.status === 'CANCELLED') {
        return res.status(400).json({
          error: 'Cannot cancel this reservation',
        })
      }

      const updatedReservation = await prisma.reservation.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'REFUNDED',
        },
      })

      logger.info(`Reservation cancelled: ${id}`)

      return res.json({
        success: true,
        message: 'Reservation cancelled successfully',
        reservation: updatedReservation,
      })
    } catch (error: unknown) {
      logger.error('Error cancelling reservation')
      return res.status(500).json({
        error: 'Failed to cancel reservation',
      })
    }
  }

  /**
   * Get all reservations (admin only)
   * GET /api/reservations
   */
  static async getAllReservations(req: Request, res: Response) {
    try {
      const { status, serviceType, page = 1, limit = 10 } = req.query

      const where: any = {}
      if (status) where.status = status
      if (serviceType) where.serviceType = serviceType

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

      const [reservations, total] = await Promise.all([
        prisma.reservation.findMany({
          where,
          include: {
            vehicle: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            reservationDate: 'desc',
          },
          skip,
          take: parseInt(limit as string),
        }),
        prisma.reservation.count({ where }),
      ])

      return res.json({
        success: true,
        reservations,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      })
    } catch (error: unknown) {
      logger.error('Error fetching all reservations')
      return res.status(500).json({
        error: 'Failed to fetch reservations',
      })
    }
  }

  /**
   * Update a reservation (admin only)
   * PUT /api/reservations/:id
   */
  static async updateReservation(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { status, notes, assignedMechanicId } = req.body

      const reservation = await prisma.reservation.update({
        where: { id },
        data: {
          status,
          notes,
          assignedMechanicId,
        },
        include: {
          vehicle: true,
        },
      })

      logger.info(`Reservation updated: ${id}`)

      return res.json({
        success: true,
        message: 'Reservation updated successfully',
        reservation,
      })
    } catch (error: unknown) {
      logger.error('Error updating reservation')
      return res.status(500).json({
        error: 'Failed to update reservation',
      })
    }
  }

  /**
   * Delete a reservation (admin only)
   * DELETE /api/reservations/:id
   */
  static async deleteReservation(req: Request, res: Response) {
    try {
      const { id } = req.params

      await prisma.reservation.delete({
        where: { id },
      })

      logger.info(`Reservation deleted: ${id}`)

      return res.json({
        success: true,
        message: 'Reservation deleted successfully',
      })
    } catch (error: unknown) {
      logger.error('Error deleting reservation')
      return res.status(500).json({
        error: 'Failed to delete reservation',
      })
    }
  }

  /**
   * Assign mechanic to reservation (admin only)
   * PUT /api/reservations/:id/assign
   */
  static async assignMechanic(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { mechanicId } = req.body

      if (!mechanicId) {
        return res.status(400).json({
          error: 'Mechanic ID is required',
        })
      }

      const reservation = await prisma.reservation.update({
        where: { id },
        data: {
          assignedMechanicId: mechanicId,
          status: 'ASSIGNED',
        },
        include: {
          vehicle: true,
        },
      })

      logger.info(`Mechanic assigned to reservation: ${id}`)

      return res.json({
        success: true,
        message: 'Mechanic assigned successfully',
        reservation,
      })
    } catch (error: unknown) {
      logger.error('Error assigning mechanic')
      return res.status(500).json({
        error: 'Failed to assign mechanic',
      })
    }
  }
}
