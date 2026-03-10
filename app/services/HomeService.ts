/**
 * HOME SERVICE
 * Service pour récupérer les données de la page d'accueil
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

export interface Promotion {
  id: string
  title: string
  description: string
  discount: number
  code?: string
  validUntil: string
  image?: string
  icon: string
}

export interface Reminder {
  id: string
  type: 'warning' | 'success' | 'info'
  title: string
  message: string
  daysLeft?: number
  icon: string
}

export interface UpcomingReservation {
  id: string
  service: string
  date: string
  time: string
  vehicle: string
}

export interface HomeData {
  promotions: Promotion[]
  reminders: Reminder[]
  upcomingReservation?: UpcomingReservation
  userName: string
}

export class HomeService {
  private api: AxiosInstance

  constructor(baseURL: string = 'http://localhost:3000/api') {
    this.api = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem('authToken')
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })
  }

  /**
   * Récupérer toutes les données de la page d'accueil
   */
  async getHomeData(): Promise<HomeData> {
    try {
      const response = await this.api.get<HomeData>('/home')
      return response.data
    } catch (error) {
      this.handleError('getHomeData', error)
      throw error
    }
  }

  /**
   * Récupérer les promotions actuelles
   */
  async getPromotions(): Promise<Promotion[]> {
    try {
      const response = await this.api.get<{ promotions: Promotion[] }>('/home/promotions')
      return response.data.promotions
    } catch (error) {
      this.handleError('getPromotions', error)
      throw error
    }
  }

  /**
   * Rechercher les promotions par mot-clé
   */
  async searchPromotions(query: string): Promise<Promotion[]> {
    try {
      const response = await this.api.get<{ promotions: Promotion[] }>('/home/promotions/search', {
        params: { q: query }
      })
      return response.data.promotions
    } catch (error) {
      this.handleError('searchPromotions', error)
      throw error
    }
  }

  /**
   * Récupérer les rappels/alertes du utilisateur
   */
  async getReminders(): Promise<Reminder[]> {
    try {
      const response = await this.api.get<{ reminders: Reminder[] }>('/home/reminders')
      return response.data.reminders
    } catch (error) {
      this.handleError('getReminders', error)
      throw error
    }
  }

  /**
   * Récupérer le prochain rendez-vous
   */
  async getUpcomingReservation(): Promise<UpcomingReservation | null> {
    try {
      const response = await this.api.get<{ reservation: UpcomingReservation | null }>(
        '/home/upcoming-reservation'
      )
      return response.data.reservation
    } catch (error) {
      this.handleError('getUpcomingReservation', error)
      throw error
    }
  }

  /**
   * Obtenir les informations du profil utilisateur
   */
  async getUserInfo(): Promise<{ name: string; email: string; phone: string }> {
    try {
      const response = await this.api.get('/home/user-info')
      return response.data
    } catch (error) {
      this.handleError('getUserInfo', error)
      throw error
    }
  }

  /**
   * Gestion des erreurs
   */
  private handleError(method: string, error: any): void {
    if (axios.isAxiosError(error)) {
      console.error(`HomeService.${method} error:`, {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      })
    } else {
      console.error(`HomeService.${method} error:`, error)
    }
  }
}

export default new HomeService()
