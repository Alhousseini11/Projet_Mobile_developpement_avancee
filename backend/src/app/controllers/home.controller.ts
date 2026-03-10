/**
 * HOME CONTROLLER
 * Handles home/dashboard data
 */

import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { logger } from '../../config/logger'

const prisma = new PrismaClient()

export class HomeController {
  /**
   * Get all home/dashboard data
   * GET /api/home
   */
  static async getHomeData(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id

      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePicture: true,
        },
      })

      // Get upcoming reservation
      const upcomingReservation = await prisma.reservation.findFirst({
        where: {
          userId,
          reservationDate: {
            gte: new Date(),
          },
          status: {
            not: 'CANCELLED',
          },
        },
        include: {
          vehicle: true,
        },
        orderBy: {
          reservationDate: 'asc',
        },
      })

      // Get promotions
      const promotions = [
        {
          id: '1',
          title: 'Oil Change',
          description: 'Full synthetic oil change',
          originalPrice: 50,
          discountedPrice: 25,
          discount: 50,
          icon: '🛢️',
          category: 'MAINTENANCE',
        },
        {
          id: '2',
          title: 'Tire Rotation',
          description: 'Professional tire rotation and balancing',
          originalPrice: 60,
          discountedPrice: 25,
          discount: 58,
          icon: '🛞',
          category: 'MAINTENANCE',
        },
        {
          id: '3',
          title: 'Brake Inspection',
          description: 'Complete brake system check',
          originalPrice: 80,
          discountedPrice: 25,
          discount: 69,
          icon: '🛑',
          category: 'INSPECTION',
        },
        {
          id: '4',
          title: 'Air Filter Replacement',
          description: 'Engine air filter replacement',
          originalPrice: 40,
          discountedPrice: 25,
          discount: 38,
          icon: '💨',
          category: 'MAINTENANCE',
        },
      ]

      // Get reminders based on vehicle maintenance
      const vehicles = await prisma.vehicle.findMany({
        where: { userId },
      })

      const reminders = await prisma.reminder.findMany({
        where: {
          userId,
          completed: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      })

      // Transform reminders to include priority level
      const enhancedReminders = reminders.map((reminder: any) => ({
        ...reminder,
        priority: this.calculateReminderPriority(reminder),
      }))

      return res.json({
        success: true,
        data: {
          user,
          upcomingReservation,
          promotions,
          reminders: enhancedReminders,
          vehicleCount: vehicles.length,
        },
      })
    } catch (error: unknown) {
      logger.error('Error fetching home data')
      return res.status(500).json({
        error: 'Failed to fetch home data',
      })
    }
  }

  /**
   * Get all promotions
   * GET /api/home/promotions
   */
  static async getPromotions(req: Request, res: Response) {
    try {
      const promotions = [
        {
          id: '1',
          title: 'Oil Change',
          description: 'Full synthetic oil change',
          originalPrice: 50,
          discountedPrice: 25,
          discount: 50,
          icon: '🛢️',
          category: 'MAINTENANCE',
        },
        {
          id: '2',
          title: 'Tire Rotation',
          description: 'Professional tire rotation and balancing',
          originalPrice: 60,
          discountedPrice: 25,
          discount: 58,
          icon: '🛞',
          category: 'MAINTENANCE',
        },
        {
          id: '3',
          title: 'Brake Inspection',
          description: 'Complete brake system check',
          originalPrice: 80,
          discountedPrice: 25,
          discount: 69,
          icon: '🛑',
          category: 'INSPECTION',
        },
        {
          id: '4',
          title: 'Air Filter Replacement',
          description: 'Engine air filter replacement',
          originalPrice: 40,
          discountedPrice: 25,
          discount: 38,
          icon: '💨',
          category: 'MAINTENANCE',
        },
        {
          id: '5',
          title: 'Battery Test',
          description: 'Free battery testing and diagnosis',
          originalPrice: 30,
          discountedPrice: 25,
          discount: 17,
          icon: '🔋',
          category: 'INSPECTION',
        },
        {
          id: '6',
          title: 'Coolant Flush',
          description: 'Complete cooling system service',
          originalPrice: 70,
          discountedPrice: 25,
          discount: 64,
          icon: '❄️',
          category: 'MAINTENANCE',
        },
      ]

      return res.json({
        success: true,
        promotions,
        total: promotions.length,
      })
    } catch (error: unknown) {
      logger.error('Error fetching promotions')
      return res.status(500).json({
        error: 'Failed to fetch promotions',
      })
    }
  }

  /**
   * Search promotions
   * GET /api/home/promotions/search?q=QUERY
   */
  static async searchPromotions(req: Request, res: Response) {
    try {
      const { q } = req.query

      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          error: 'Search query is required',
        })
      }

      const query = q.toLowerCase()

      const allPromotions = [
        {
          id: '1',
          title: 'Oil Change',
          description: 'Full synthetic oil change',
          originalPrice: 50,
          discountedPrice: 25,
          discount: 50,
          icon: '🛢️',
          category: 'MAINTENANCE',
        },
        {
          id: '2',
          title: 'Tire Rotation',
          description: 'Professional tire rotation and balancing',
          originalPrice: 60,
          discountedPrice: 25,
          discount: 58,
          icon: '🛞',
          category: 'MAINTENANCE',
        },
        {
          id: '3',
          title: 'Brake Inspection',
          description: 'Complete brake system check',
          originalPrice: 80,
          discountedPrice: 25,
          discount: 69,
          icon: '🛑',
          category: 'INSPECTION',
        },
        {
          id: '4',
          title: 'Air Filter Replacement',
          description: 'Engine air filter replacement',
          originalPrice: 40,
          discountedPrice: 25,
          discount: 38,
          icon: '💨',
          category: 'MAINTENANCE',
        },
      ]

      const filteredPromotions = allPromotions.filter(
        (promo) =>
          promo.title.toLowerCase().includes(query) ||
          promo.description.toLowerCase().includes(query) ||
          promo.category.toLowerCase().includes(query)
      )

      return res.json({
        success: true,
        promotions: filteredPromotions,
        total: filteredPromotions.length,
      })
    } catch (error: unknown) {
      logger.error('Error searching promotions')
      return res.status(500).json({
        error: 'Failed to search promotions',
      })
    }
  }

  /**
   * Get user's reminders
   * GET /api/home/reminders
   */
  static async getReminders(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id

      const reminders = await prisma.reminder.findMany({
        where: { userId },
        orderBy: {
          createdAt: 'desc',
        },
      })

      const enhancedReminders = reminders.map((reminder: any) => ({
        ...reminder,
        priority: this.calculateReminderPriority(reminder),
      }))

      return res.json({
        success: true,
        reminders: enhancedReminders,
        total: enhancedReminders.length,
      })
    } catch (error: unknown) {
      logger.error('Error fetching reminders')
      return res.status(500).json({
        error: 'Failed to fetch reminders',
      })
    }
  }

  /**
   * Get upcoming reservation
   * GET /api/home/upcoming-reservation
   */
  static async getUpcomingReservation(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id

      const upcomingReservation = await prisma.reservation.findFirst({
        where: {
          userId,
          reservationDate: {
            gte: new Date(),
          },
          status: {
            not: 'CANCELLED',
          },
        },
        include: {
          vehicle: true,
        },
        orderBy: {
          reservationDate: 'asc',
        },
      })

      if (!upcomingReservation) {
        return res.json({
          success: true,
          reservation: null,
          message: 'No upcoming reservations',
        })
      }

      return res.json({
        success: true,
        reservation: upcomingReservation,
      })
    } catch (error: unknown) {
      logger.error('Error fetching upcoming reservation')
      return res.status(500).json({
        error: 'Failed to fetch upcoming reservation',
      })
    }
  }

  /**
   * Get user info
   * GET /api/home/user-info
   */
  static async getUserInfo(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          profilePicture: true,
          role: true,
          createdAt: true,
        },
      })

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
        })
      }

      return res.json({
        success: true,
        user,
      })
    } catch (error: unknown) {
      logger.error('Error fetching user info')
      return res.status(500).json({
        error: 'Failed to fetch user info',
      })
    }
  }

  /**
   * Helper: Calculate reminder priority
   */
  private static calculateReminderPriority(reminder: any): 'high' | 'medium' | 'low' {
    // If completed, low priority
    if (reminder.completed) return 'low'

    // Check threshold date
    const today = new Date()
    const reminderDate = new Date(reminder.dueDate || reminder.createdAt)
    const daysUntilDue = Math.ceil((reminderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilDue <= 3) return 'high'
    if (daysUntilDue <= 7) return 'medium'
    return 'low'
  }
}
