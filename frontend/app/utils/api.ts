import { clearStoredSession, getStoredAccessToken } from '@/utils/authStorage'

const API_BASE_URL = 'http://167.99.178.126:3000/api'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions extends RequestInit {
  method?: HttpMethod
  body?: any
  headers?: Record<string, string>
}

async function apiRequest<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, ...rest } = options
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers
  }

  const accessToken = getStoredAccessToken()
  if (accessToken && !finalHeaders.Authorization) {
    finalHeaders.Authorization = `Bearer ${accessToken}`
  }

  const url = `${API_BASE_URL}${path}`
  const response = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
    ...rest
  })

  console.log(`[API] ${method} ${url} -> ${response.status}`)

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredSession()
    }

    const text = await response.text()
    throw new Error(`API ${method} ${path} failed: ${response.status} ${text}`)
  }

  // Some endpoints might return empty body (204)
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }
  return undefined as unknown as T
}

export { API_BASE_URL, apiRequest }
