import { clearStoredSession, getStoredAccessToken } from '@/utils/authStorage'

const API_BASE_URL = 'http://167.99.178.126:3000/api'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions extends RequestInit {
  method?: HttpMethod
  body?: any
  headers?: Record<string, string>
  timeoutMs?: number
}

const GET_RETRY_DELAYS_MS = [350, 900]

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function createTimeoutError(timeoutMs: number) {
  return new Error(`Request timed out after ${timeoutMs}ms`)
}

function isRetryableNetworkError(error: unknown) {
  return error instanceof TypeError && error.message.toLowerCase().includes('network request failed')
}

function isTimeoutError(error: unknown) {
  return error instanceof Error && error.message.startsWith('Request timed out after ')
}

async function fetchWithOptionalTimeout(
  url: string,
  init: RequestInit,
  timeoutMs?: number
): Promise<Response> {
  if (!timeoutMs) {
    return fetch(url, init)
  }

  if (typeof AbortController !== 'undefined') {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, timeoutMs)

    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal
      })
    } catch (error) {
      if (controller.signal.aborted) {
        throw createTimeoutError(timeoutMs)
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race([
      fetch(url, init),
      new Promise<Response>((_resolve, reject) => {
        timeoutId = setTimeout(() => {
          reject(createTimeoutError(timeoutMs))
        }, timeoutMs)
      })
    ])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
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
  const maxAttempts = method === 'GET' ? GET_RETRY_DELAYS_MS.length + 1 : 1
  let response: Response | null = null
  let lastError: unknown = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      response = await fetchWithOptionalTimeout(
        url,
        {
        method,
        headers: finalHeaders,
        body: body ? JSON.stringify(body) : undefined,
        ...rest
        },
        timeoutMs
      )
      break
    } catch (error) {
      lastError = error

      const shouldRetry =
        attempt < maxAttempts && (isRetryableNetworkError(error) || isTimeoutError(error))

      if (!shouldRetry) {
        throw lastError
      }

      const retryDelay = GET_RETRY_DELAYS_MS[Math.min(attempt - 1, GET_RETRY_DELAYS_MS.length - 1)]
      await delay(retryDelay)
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
