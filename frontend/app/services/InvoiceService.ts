import { API_BASE_URL, apiRequest } from '@/utils/api'
import { readStoredSession } from '@/utils/authStorage'
import type { InvoiceSummary } from '@/types/invoice'

const DEMO_INVOICE_EMAIL = 'alex.martin@example.com'
const MOCK_INVOICES: InvoiceSummary[] = [
  {
    id: 'invoice-1001',
    number: 'INV-2026-001',
    serviceLabel: 'Vidange',
    issuedAt: '2026-03-10',
    appointmentDate: '2026-03-18',
    totalAmount: 90.86,
    taxAmount: 11.86,
    currency: 'CAD',
    status: 'paid'
  },
  {
    id: 'invoice-1002',
    number: 'INV-2026-002',
    serviceLabel: 'Diagnostic',
    issuedAt: '2026-03-12',
    appointmentDate: '2026-03-22',
    totalAmount: 67.84,
    taxAmount: 8.84,
    currency: 'CAD',
    status: 'pending'
  }
]
const fallbackInvoicesByEmail = new Map<string, InvoiceSummary[]>()

function getInvoiceFallbackKey() {
  return readStoredSession()?.user.email?.trim().toLowerCase() || DEMO_INVOICE_EMAIL
}

function getFallbackInvoiceStore() {
  const key = getInvoiceFallbackKey()
  const existing = fallbackInvoicesByEmail.get(key)
  if (existing) {
    return existing
  }

  const initialInvoices = key === DEMO_INVOICE_EMAIL ? MOCK_INVOICES.map(invoice => ({ ...invoice })) : []
  fallbackInvoicesByEmail.set(key, initialInvoices)
  return initialInvoices
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    promise
      .then(value => {
        clearTimeout(timeoutId)
        resolve(value)
      })
      .catch(error => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

class InvoiceService {
  getFallbackInvoices(): InvoiceSummary[] {
    return getFallbackInvoiceStore().map(invoice => ({ ...invoice }))
  }

  async getInvoices(): Promise<InvoiceSummary[]> {
    try {
      const invoices = await withTimeout(apiRequest<InvoiceSummary[]>('/profile/invoices'), 1500)
      fallbackInvoicesByEmail.set(
        getInvoiceFallbackKey(),
        invoices.map(invoice => ({ ...invoice }))
      )
      return invoices.map(invoice => ({ ...invoice }))
    } catch (error) {
      console.error('Error fetching invoices:', error)
      return this.getFallbackInvoices()
    }
  }

  getInvoicePdfUrl(invoiceId: string) {
    return `${API_BASE_URL}/profile/invoices/${encodeURIComponent(invoiceId)}/pdf`
  }
}

export default new InvoiceService()
