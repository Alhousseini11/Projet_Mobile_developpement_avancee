import { apiRequest } from '@/utils/api'
import type {
  CreateReservationDTO,
  Reservation,
  ReservationServiceOption
} from '@/types/reservation'

export type {
  CreateReservationDTO,
  Reservation,
  ReservationServiceOption
} from '@/types/reservation'

const MOCK_SERVICES: ReservationServiceOption[] = [
  {
    id: 'oil-change',
    label: 'Vidange',
    durationMinutes: 45,
    price: 79
  },
  {
    id: 'brakes',
    label: 'Freins',
    durationMinutes: 90,
    price: 149
  },
  {
    id: 'battery',
    label: 'Batterie',
    durationMinutes: 30,
    price: 99
  },
  {
    id: 'diagnostic',
    label: 'Diagnostic',
    durationMinutes: 60,
    price: 59
  }
]

const MOCK_SLOT_BY_SERVICE: Record<string, string[]> = {
  'oil-change': ['08:30', '10:00', '13:30', '15:00'],
  brakes: ['09:00', '11:30', '14:00', '16:30'],
  battery: ['08:00', '10:30', '13:00', '17:00'],
  diagnostic: ['09:30', '12:00', '15:30', '18:00']
}

const MOCK_RESERVATIONS: Reservation[] = []
MOCK_RESERVATIONS.push(
  {
    id: 'reservation-1',
    serviceId: 'oil-change',
    serviceLabel: 'Vidange',
    date: '2026-03-18',
    time: '10:00',
    status: 'confirmed',
    createdAt: new Date('2026-03-10T09:00:00'),
    updatedAt: new Date('2026-03-10T09:00:00')
  },
  {
    id: 'reservation-2',
    serviceId: 'diagnostic',
    serviceLabel: 'Diagnostic',
    date: '2026-03-22',
    time: '15:30',
    status: 'pending',
    createdAt: new Date('2026-03-12T14:15:00'),
    updatedAt: new Date('2026-03-12T14:15:00')
  }
)

const RESERVATION_READ_TIMEOUT_MS = 9000

let reservationServicesRequest: Promise<ReservationServiceOption[]> | null = null
let reservationsRequest: Promise<Reservation[]> | null = null
const slotsRequestByKey = new Map<string, Promise<string[]>>()

function cloneService(service: ReservationServiceOption): ReservationServiceOption {
  return { ...service }
}

function cloneReservation(reservation: Reservation): Reservation {
  return {
    ...reservation,
    createdAt: new Date(reservation.createdAt),
    updatedAt: new Date(reservation.updatedAt)
  }
}

class ReservationService {
  getFallbackServices(): ReservationServiceOption[] {
    return MOCK_SERVICES.map(cloneService)
  }

  getFallbackAvailableSlots(serviceId: string, date: string): string[] {
    const baseSlots = MOCK_SLOT_BY_SERVICE[serviceId] ?? ['09:00', '11:00', '14:00', '16:00']
    const reservedSlots = MOCK_RESERVATIONS
      .filter(reservation => reservation.serviceId === serviceId && reservation.date === date)
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
        return services.map(cloneService)
      } catch (error) {
        console.warn('Error fetching reservation services:', error)
        return this.getFallbackServices()
      } finally {
        reservationServicesRequest = null
      }
    })()

    return reservationServicesRequest.then(services => services.map(cloneService))
  }

  async getAvailableSlots(serviceId: string, date: string): Promise<string[]> {
    const requestKey = `${serviceId}:${date}`
    const existingRequest = slotsRequestByKey.get(requestKey)
    if (existingRequest) {
      return existingRequest.then(slots => [...slots])
    }

    const request = (async () => {
      try {
        const slots = await apiRequest<string[]>(
          `/reservations/slots?serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}`,
          { timeoutMs: RESERVATION_READ_TIMEOUT_MS }
        )
        return [...slots]
      } catch (error) {
        console.warn(`Error fetching slots for ${serviceId} on ${date}:`, error)
        return this.getFallbackAvailableSlots(serviceId, date)
      } finally {
        slotsRequestByKey.delete(requestKey)
      }
    })()

    slotsRequestByKey.set(requestKey, request)
    return request.then(slots => [...slots])
  }

  getFallbackReservations(): Reservation[] {
    return [...MOCK_RESERVATIONS]
      .sort((left, right) => {
        const leftKey = `${left.date}T${left.time}:00`
        const rightKey = `${right.date}T${right.time}:00`
        return leftKey.localeCompare(rightKey)
      })
      .map(reservation => this.normalize(reservation))
  }

  async getMyReservations(): Promise<Reservation[]> {
    if (reservationsRequest) {
      return reservationsRequest.then(reservations => reservations.map(cloneReservation))
    }

    reservationsRequest = (async () => {
      try {
        const reservations = await apiRequest<Reservation[]>('/reservations', {
          timeoutMs: RESERVATION_READ_TIMEOUT_MS
        })
        return reservations.map(cloneReservation)
      } catch (error) {
        console.warn('Error fetching reservations:', error)
        return this.getFallbackReservations()
      } finally {
        reservationsRequest = null
      }
    })()

    return reservationsRequest.then(reservations => reservations.map(cloneReservation))
  }

  async createReservation(data: CreateReservationDTO): Promise<Reservation> {
    try {
      const created = await apiRequest<Reservation>('/reservations', {
        method: 'POST',
        body: data
      })

      return this.normalize(created)
    } catch (error) {
      console.error('Error creating reservation:', error)

      const reservation: Reservation = {
        id: `reservation-${MOCK_RESERVATIONS.length + 1}`,
        ...data,
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      MOCK_RESERVATIONS.unshift(reservation)
      return reservation
    }
  }

  private normalize(reservation: Reservation): Reservation {
    return cloneReservation(reservation)
  }
}

export default new ReservationService()
