import { clearStoredSession, getStoredAccessToken } from '@/utils/authStorage'

const API_BASE_URL = 'http://167.99.178.126:3000/api'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions extends RequestInit {
  method?: HttpMethod
  body?: any
  headers?: Record<string, string>
  timeoutMs?: number
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetryableNetworkError(error: unknown) {
  return error instanceof TypeError && error.message.toLowerCase().includes('network request failed')
}

async function apiRequest<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, timeoutMs, ...rest } = options
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers
  }

  const accessToken = getStoredAccessToken()
  if (accessToken && !finalHeaders.Authorization) {
    finalHeaders.Authorization = `Bearer ${accessToken}`
  }

  const url = `${API_BASE_URL}${path}`
  const maxAttempts = method === 'GET' ? 2 : 1
  let response: Response | null = null
  let lastError: unknown = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = timeoutMs ? new AbortController() : null
    const timeoutId =
      controller && timeoutMs
        ? setTimeout(() => {
            controller.abort()
          }, timeoutMs)
        : null

    try {
      response = await fetch(url, {
        method,
        headers: finalHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller?.signal,
        ...rest
      })
      break
    } catch (error) {
      lastError =
        controller?.signal.aborted && timeoutMs
          ? new Error(`Request timed out after ${timeoutMs}ms`)
          : error

      if (attempt >= maxAttempts || !isRetryableNetworkError(error)) {
        throw lastError
      }

      await delay(250)
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }

  if (!response) {
    throw lastError instanceof Error ? lastError : new Error(`Unable to call ${url}`)
  }

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
