export interface Review {
  id: string
  reservationId: string
  reservationLabel: string
  appointmentDate: string
  rating: number
  comment: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateReviewDTO {
  reservationId: string
  rating: number
  comment?: string
}
