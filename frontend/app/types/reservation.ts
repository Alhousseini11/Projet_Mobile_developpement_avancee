export type ReservationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export interface ReservationServiceOption {
  id: string
  label: string
  durationMinutes: number
  price: number
  reviewAverage: number
  reviewCount: number
}

export interface Reservation {
  id: string
  serviceId: string
  serviceLabel: string
  date: string
  time: string
  status: ReservationStatus
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateReservationDTO {
  serviceId: string
  serviceLabel: string
  date: string
  time: string
  notes?: string
}
