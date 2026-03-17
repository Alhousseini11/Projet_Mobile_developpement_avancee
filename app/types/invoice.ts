export type InvoiceStatus = 'paid' | 'pending'

export interface InvoiceSummary {
  id: string
  number: string
  serviceLabel: string
  issuedAt: string
  appointmentDate: string
  totalAmount: number
  taxAmount: number
  currency: string
  status: InvoiceStatus
}
