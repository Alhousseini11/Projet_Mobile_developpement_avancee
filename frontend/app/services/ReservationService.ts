import {
  DEMO_ACCOUNT,
  createDemoReservations,
  getCurrentSessionFallbackKey
} from '@/config/demo'
import { apiRequest } from '@/utils/api'
import type {
  CreateReservationDTO,
  Reservation,
  ReservationServiceOption,
  UpdateReservationDTO
} from '@/types/reservation'

export type {
  CreateReservationDTO,
  Reservation,
  ReservationServiceOption,
  UpdateReservationDTO
} from '@/types/reservation'

const MOCK_SERVICES: ReservationServiceOption[] = [
  {
    id: 'oil-change',
    label: 'Vidange',
    durationMinutes: 45,
    price: 79,
    reviewAverage: 0,
    reviewCount: 0
  },
  {
    id: 'brakes',
    label: 'Freins',
    durationMinutes: 90,
    price: 149,
    reviewAverage: 0,
    reviewCount: 0
  },
  {
    id: 'battery',
    label: 'Batterie',
    durationMinutes: 30,
    price: 99,
    reviewAverage: 0,
    reviewCount: 0
  },
  {
    id: 'diagnostic',
    label: 'Diagnostic',
    durationMinutes: 60,
    price: 59,
    reviewAverage: 0,
    reviewCount: 0
  }
]

const MOCK_SLOT_BY_SERVICE: Record<string, string[]> = {
  'oil-change': ['08:30', '10:00', '13:30', '15:00'],
  brakes: ['09:00', '11:30', '14:00', '16:30'],
  battery: ['08:00', '10:30', '13:00', '17:00'],
  diagnostic: ['09:30', '12:00', '15:30', '18:00']
}

const fallbackReservationsByKey = new Map<string, Reservation[]>()

const RESERVATION_READ_TIMEOUT_MS = 9000

let reservationServicesRequest: Promise<ReservationServiceOption[]> | null = null
let reservationsRequestByKey = new Map<string, Promise<Reservation[]>>()
const slotsRequestByKey = new Map<string, Promise<string[]>>()

function normalizeService(service: Partial<ReservationServiceOption>): ReservationServiceOption {
  return {
    id: String(service.id ?? ''),
    label: String(service.label ?? ''),
    durationMinutes: Number(service.durationMinutes ?? 0),
    price: Number(service.price ?? 0),
    reviewAverage: Number(service.reviewAverage ?? 0),
    reviewCount: Number(service.reviewCount ?? 0)
  }
}

function cloneService(service: ReservationServiceOption): ReservationServiceOption {
  return normalizeService(service)
}

function cloneReservation(reservation: Reservation): Reservation {
  return {
    ...reservation,
    createdAt: new Date(reservation.createdAt),
    updatedAt: new Date(reservation.updatedAt)
  }
}

function getFallbackReservationStore(): Reservation[] {
  const key = getCurrentSessionFallbackKey()
  const existing = fallbackReservationsByKey.get(key)
  if (existing) {
    return existing
  }

  const initialReservations =
    key === DEMO_ACCOUNT.email ? createDemoReservations().map(cloneReservation) : []
  fallbackReservationsByKey.set(key, initialReservations)
  return initialReservations
}

class ReservationService {
  getFallbackServices(): ReservationServiceOption[] {
    return MOCK_SERVICES.map(cloneService)
  }

  getFallbackAvailableSlots(serviceId: string, date: string, excludeId?: string): string[] {
    const baseSlots = MOCK_SLOT_BY_SERVICE[serviceId] ?? ['09:00', '11:00', '14:00', '16:00']
    const reservedSlots = getFallbackReservationStore()
      .filter(
        reservation =>
          reservation.serviceId === serviceId &&
          reservation.date === date &&
          reservation.id !== excludeId
      )
      .map(reservation => reservation.time)

    return baseSlots.filter(slot => !reservedSlots.includes(slot))
  }

  async getServices(): Promise<ReservationServiceOption[]> {
    if (reservationServicesRequest) {
      return reservationServicesRequest.then(services => services.map(cloneService))
    }

    reservationServicesRequest = (async () => {
      try {
        const services = await apiRequest<ReservationServiceOption[]>('/reservations/services', {
          timeoutMs: RESERVATION_READ_TIMEOUT_MS
        })
        return services.map(service => normalizeService(service))
      } catch (error) {
        console.warn('Error fetching reservation services:', error)
        return this.getFallbackServices()
      } finally {
        reservationServicesRequest = null
      }
    })()

    return reservationServicesRequest.then(services => services.map(cloneService))
  }

  async getAvailableSlots(serviceId: string, date: string, excludeId?: string): Promise<string[]> {
    const requestKey = `${serviceId}:${date}:${excludeId ?? ''}`
    const existingRequest = slotsRequestByKey.get(requestKey)
    if (existingRequest) {
      return existingRequest.then(slots => [...slots])
    }

    const request = (async () => {
      try {
        const slots = await apiRequest<string[]>(
          `/reservations/slots?serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}${
            excludeId ? `&excludeId=${encodeURIComponent(excludeId)}` : ''
          }`,
          { timeoutMs: RESERVATION_READ_TIMEOUT_MS }
        )
        return [...slots]
      } catch (error) {
        console.warn(`Error fetching slots for ${serviceId} on ${date}:`, error)
        return this.getFallbackAvailableSlots(serviceId, date, excludeId)
      } finally {
        slotsRequestByKey.delete(requestKey)
      }
    })()

    slotsRequestByKey.set(requestKey, request)
    return request.then(slots => [...slots])
  }

  getFallbackReservations(): Reservation[] {
    return [...getFallbackReservationStore()]
      .sort((left, right) => {
        const leftKey = `${left.date}T${left.time}:00`
        const rightKey = `${right.date}T${right.time}:00`
        return leftKey.localeCompare(rightKey)
      })
      .map(reservation => this.normalize(reservation))
  }

  async getMyReservations(): Promise<Reservation[]> {
    const key = getCurrentSessionFallbackKey()
    const existingRequest = reservationsRequestByKey.get(key)
    if (existingRequest) {
      return existingRequest.then(reservations => reservations.map(cloneReservation))
    }

    const request = (async () => {
      try {
        const reservations = await apiRequest<Reservation[]>('/reservations', {
          timeoutMs: RESERVATION_READ_TIMEOUT_MS
        })
        const normalizedReservations = reservations.map(cloneReservation)
        fallbackReservationsByKey.set(key, normalizedReservations.map(cloneReservation))
        return normalizedReservations
      } catch (error) {
        console.warn('Error fetching reservations:', error)
        return this.getFallbackReservations()
      } finally {
        reservationsRequestByKey.delete(key)
      }
    })()

    reservationsRequestByKey.set(key, request)
    return request.then(reservations => reservations.map(cloneReservation))
  }

  async createReservation(data: CreateReservationDTO): Promise<Reservation> {
    try {
      const created = await apiRequest<Reservation>('/reservations', {
        method: 'POST',
        body: data
      })

      const normalized = this.normalize(created)
      const fallbackReservations = getFallbackReservationStore()
      fallbackReservations.unshift(cloneReservation(normalized))
      return normalized
    } catch (error) {
      console.error('Error creating reservation:', error)
      throw error
    }
  }

  async updateReservation(reservationId: string, data: UpdateReservationDTO): Promise<Reservation> {
    try {
      const updated = await apiRequest<Reservation>(`/reservations/${reservationId}`, {
        method: 'PATCH',
        body: data
      })

      const normalized = this.normalize(updated)
      const fallbackReservations = getFallbackReservationStore()
      const reservationIndex = fallbackReservations.findIndex(
        reservation => reservation.id === reservationId
      )

      if (reservationIndex >= 0) {
        fallbackReservations.splice(reservationIndex, 1, cloneReservation(normalized))
      }

      return normalized
    } catch (error) {
      console.error('Error updating reservation:', error)
      throw error
    }
  }

  private normalize(reservation: Reservation): Reservation {
    return cloneReservation(reservation)
  }
}

export default new ReservationService()
