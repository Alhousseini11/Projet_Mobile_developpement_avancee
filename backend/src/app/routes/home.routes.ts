/**
 * HOME ROUTES
 * Defines all home/dashboard endpoints
 */

import { Router } from 'express'
import { HomeController } from '../controllers/home.controller'
import { authGuard } from '../middleware/authGuard'

const router = Router()

/**
 * @route GET /api/home
 * @desc Get all home data (promotions, reminders, upcoming reservation)
 * @access Private (User)
 */
router.get('/', authGuard, HomeController.getHomeData)

/**
 * @route GET /api/home/promotions
 * @desc Get all current promotions
 * @access Public
 */
router.get('/promotions', HomeController.getPromotions)

/**
 * @route GET /api/home/promotions/search?q=QUERY
 * @desc Search promotions by query
 * @access Public
 */
router.get('/promotions/search', HomeController.searchPromotions)

/**
 * @route GET /api/home/reminders
 * @desc Get user's reminders and alerts
 * @access Private (User)
 */
router.get('/reminders', authGuard, HomeController.getReminders)

/**
 * @route GET /api/home/upcoming-reservation
 * @desc Get user's next upcoming reservation
 * @access Private (User)
 */
router.get('/upcoming-reservation', authGuard, HomeController.getUpcomingReservation)

/**
 * @route GET /api/home/user-info
 * @desc Get user profile information
 * @access Private (User)
 */
router.get('/user-info', authGuard, HomeController.getUserInfo)

export default router
