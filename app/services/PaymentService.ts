/**
 * PAYMENT SERVICE
 * Service pour gérer les paiements et intégration Stripe
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

export interface PaymentData {
  amount: number
  currency: string
  reservationId: string
  method: 'garage' | 'online'
  cardToken?: string
}

export interface PaymentResponse {
  success: boolean
  transactionId: string
  status: 'completed' | 'pending' | 'failed'
  message: string
}

export class PaymentService {
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
   * Traiter un paiement
   */
  async processPayment(data: PaymentData): Promise<PaymentResponse> {
    try {
      const response = await this.api.post<PaymentResponse>('/payments/process', data)
      return response.data
    } catch (error) {
      this.handleError('processPayment', error)
      throw error
    }
  }

  /**
   * Créer un token de carte pour Stripe
   */
  async createCardToken(cardData: {
    number: string
    expiry: string
    cvv: string
  }): Promise<string> {
    try {
      const response = await this.api.post<{ token: string }>('/payments/create-token', cardData)
      return response.data.token
    } catch (error) {
      this.handleError('createCardToken', error)
      throw error
    }
  }

  /**
   * Vérifier le statut d'une transaction
   */
  async checkPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    try {
      const response = await this.api.get<PaymentResponse>(`/payments/status/${transactionId}`)
      return response.data
    } catch (error) {
      this.handleError('checkPaymentStatus', error)
      throw error
    }
  }

  /**
   * Obtenir les clés publiques Stripe
   */
  async getStripePublicKey(): Promise<string> {
    try {
      const response = await this.api.get<{ publicKey: string }>('/payments/stripe-key')
      return response.data.publicKey
    } catch (error) {
      this.handleError('getStripePublicKey', error)
      throw error
    }
  }

  /**
   * Gestion des erreurs
   */
  private handleError(method: string, error: any): void {
    if (axios.isAxiosError(error)) {
      console.error(`PaymentService.${method} error:`, {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      })
    } else {
      console.error(`PaymentService.${method} error:`, error)
    }
  }
}

export default new PaymentService()
