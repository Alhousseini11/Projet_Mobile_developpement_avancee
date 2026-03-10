/**
 * RESERVATION SERVICE
 * Service pour gérer toutes les opérations de réservation via l'API
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type {
  Reservation,
  ReservationData,
  CreateReservationRequest,
  CreateReservationResponse,
  GetReservationsResponse
} from '../types/reservation'

export class ReservationService {
  private api: AxiosInstance

  constructor(baseURL: string = 'http://localhost:3000/api') {
    this.api = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Ajouter le token JWT si présent
    this.api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem('authToken')
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })
  }

  /**
   * Créer une nouvelle réservation
   */
  async createReservation(data: ReservationData): Promise<CreateReservationResponse> {
    try {
      const payload: CreateReservationRequest = {
        service: data.service,
        selectedDate: data.selectedDate.toISOString().split('T')[0],
        selectedTime: data.selectedTime,
        vehicleId: data.vehicleId,
        contact: data.contact,
        payment: data.payment
      }

      const response = await this.api.post<CreateReservationResponse>('/reservations', payload)
      return response.data
    } catch (error) {
      this.handleError('createReservation', error)
      throw error
    }
  }

  /**
   * Récupérer toutes les réservations de l'utilisateur
   */
  async getUserReservations(): Promise<Reservation[]> {
    try {
      const response = await this.api.get<GetReservationsResponse>('/reservations/my-reservations')
      return response.data.reservations
    } catch (error) {
      this.handleError('getUserReservations', error)
      throw error
    }
  }

  /**
   * Récupérer une réservation spécifique
   */
  async getReservation(id: string): Promise<Reservation> {
    try {
      const response = await this.api.get<Reservation>(`/reservations/${id}`)
      return response.data
    } catch (error) {
      this.handleError('getReservation', error)
      throw error
    }
  }

  /**
   * Annuler une réservation
   */
  async cancelReservation(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.api.put(`/reservations/${id}/cancel`)
      return response.data
    } catch (error) {
      this.handleError('cancelReservation', error)
      throw error
    }
  }

  /**
   * Obtenir les créneaux disponibles pour une date et service donnés
   */
  async getAvailableSlots(date: string, service: string): Promise<string[]> {
    try {
      const response = await this.api.get<string[]>('/reservations/available-slots', {
        params: { date, service }
      })
      return response.data
    } catch (error) {
      this.handleError('getAvailableSlots', error)
      throw error
    }
  }

  /**
   * Gestion des erreurs
   */
  private handleError(method: string, error: any): void {
    if (axios.isAxiosError(error)) {
      console.error(`ReservationService.${method} error:`, {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        data: error.response?.data
      })
    } else {
      console.error(`ReservationService.${method} error:`, error)
    }
  }
}

export default new ReservationService()
