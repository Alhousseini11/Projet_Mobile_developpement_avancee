import { DEMO_ACCOUNT, createDemoInvoices, getCurrentSessionFallbackKey } from '@/config/demo'
import { knownFolders, path } from '@nativescript/core/file-system'
import { getFile } from '@nativescript/core/http'
import { API_BASE_URL, apiRequest } from '@/utils/api'
import { getStoredAccessToken } from '@/utils/authStorage'
import type { InvoiceSummary } from '@/types/invoice'

const INVOICE_READ_TIMEOUT_MS = 8000
const fallbackInvoicesByKey = new Map<string, InvoiceSummary[]>()

function cloneInvoice(invoice: InvoiceSummary): InvoiceSummary {
  return { ...invoice }
}

function getFallbackInvoiceStore() {
  const key = getCurrentSessionFallbackKey()
  const existing = fallbackInvoicesByKey.get(key)
  if (existing) {
    return existing
  }

  const initialInvoices =
    key === DEMO_ACCOUNT.email ? createDemoInvoices().map(cloneInvoice) : []
  fallbackInvoicesByKey.set(key, initialInvoices)
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
    return getFallbackInvoiceStore().map(cloneInvoice)
  }

  async getInvoices(): Promise<InvoiceSummary[]> {
    const key = getCurrentSessionFallbackKey()

    try {
      const invoices = await withTimeout(apiRequest<InvoiceSummary[]>('/profile/invoices'), INVOICE_READ_TIMEOUT_MS)
      fallbackInvoicesByKey.set(key, invoices.map(cloneInvoice))
      return invoices.map(cloneInvoice)
    } catch (error) {
      console.error('Error fetching invoices:', error)
      return this.getFallbackInvoices()
    }
  }

  getInvoicePdfUrl(invoiceId: string) {
    return `${API_BASE_URL}/profile/invoices/${encodeURIComponent(invoiceId)}/pdf`
  }

  async downloadInvoicePdf(invoice: Pick<InvoiceSummary, 'id' | 'number'>) {
    const accessToken = getStoredAccessToken()

    if (!accessToken) {
      throw new Error('Vous devez etre connecte pour telecharger une facture.')
    }

    const invoicesFolder = knownFolders.documents().getFolder('factures')
    const fileName = `${invoice.number.replace(/[^A-Za-z0-9._-]/g, '-')}.pdf`
    const destinationPath = path.join(invoicesFolder.path, fileName)

    const downloadedFile = await getFile(
      {
        url: this.getInvoicePdfUrl(invoice.id),
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/pdf'
        }
      },
      destinationPath
    )

    return {
      fileName,
      path: downloadedFile.path
    }
  }
}

export default new InvoiceService()
