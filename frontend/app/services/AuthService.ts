import { reactive } from 'nativescript-vue'
import { apiRequest } from '@/utils/api'
import { clearStoredSession, readStoredSession, writeStoredSession } from '@/utils/authStorage'
import type {
  AuthSession,
  AuthState,
  ForgotPasswordResponse,
  LoginCredentials,
  RegisterCredentials,
  ResetPasswordPayload
} from '@/types/auth'

const DEMO_EMAIL = 'alex.martin@example.com'
const DEMO_PASSWORD = 'Garage123!'

export const authState = reactive<AuthState>({
  initialized: false,
  isAuthenticated: false,
  session: null
})

let initializationPromise: Promise<void> | null = null

function cloneSession(session: AuthSession | null): AuthSession | null {
  if (!session) {
    return null
  }

  return {
    ...session,
    user: { ...session.user }
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
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

function applySession(session: AuthSession, rememberMe: boolean) {
  authState.session = cloneSession(session)
  authState.isAuthenticated = true
  authState.initialized = true

  writeStoredSession(session, rememberMe)
}

function clearAuthState() {
  authState.session = null
  authState.isAuthenticated = false
  authState.initialized = true
}

function isInvalidSessionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  return (
    error.message.includes('401') ||
    error.message.includes('Jeton invalide') ||
    error.message.includes('Session invalide') ||
    error.message.includes('Session introuvable')
  )
}

class AuthService {
  async initializeSession() {
    if (authState.initialized) {
      return
    }

    if (initializationPromise) {
      return initializationPromise
    }

    initializationPromise = (async () => {
      const storedSession = readStoredSession()
      if (!storedSession) {
        authState.initialized = true
        return
      }

      authState.session = cloneSession(storedSession)
      authState.isAuthenticated = true

      if (!storedSession.refreshToken) {
        authState.initialized = true
        return
      }

      try {
        const refreshedSession = await withTimeout(
          apiRequest<AuthSession>('/auth/refresh', {
            method: 'POST',
            body: {
              refreshToken: storedSession.refreshToken
            }
          }),
          4000
        )

        applySession(refreshedSession, true)
      } catch (error) {
        if (isInvalidSessionError(error)) {
          clearStoredSession()
          clearAuthState()
          return
        }

        console.warn('Unable to validate stored session, keeping local session:', error)
        authState.initialized = true
      }
    })()

    try {
      await initializationPromise
    } finally {
      initializationPromise = null
    }
  }

  getDemoCredentials() {
    return {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD
    }
  }

  getSession() {
    return cloneSession(authState.session)
  }

  isAuthenticated() {
    return authState.isAuthenticated
  }

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const session = await withTimeout(
      apiRequest<AuthSession>('/auth/login', {
        method: 'POST',
        body: {
          email: credentials.email.trim(),
          password: credentials.password
        }
      }),
      4000
    )

    applySession(session, credentials.rememberMe)
    return cloneSession(session) as AuthSession
  }

  async register(credentials: RegisterCredentials): Promise<AuthSession> {
    const session = await withTimeout(
      apiRequest<AuthSession>('/auth/register', {
        method: 'POST',
        body: {
          fullName: credentials.fullName.trim(),
          email: credentials.email.trim(),
          phone: credentials.phone.trim(),
          password: credentials.password
        }
      }),
      5000
    )

    applySession(session, credentials.rememberMe)
    return cloneSession(session) as AuthSession
  }

  async requestPasswordReset(email: string): Promise<ForgotPasswordResponse> {
    return withTimeout(
      apiRequest<ForgotPasswordResponse>('/auth/forgot-password', {
        method: 'POST',
        body: {
          email: email.trim()
        }
      }),
      4000
    )
  }

  async resetPassword(payload: ResetPasswordPayload): Promise<AuthSession> {
    const response = await withTimeout(
      apiRequest<AuthSession>('/auth/reset-password', {
        method: 'POST',
        body: {
          token: payload.token.trim(),
          newPassword: payload.newPassword
        }
      }),
      5000
    )

    applySession(response, payload.rememberMe)
    return cloneSession(response) as AuthSession
  }

  async refreshSession() {
    const refreshToken = authState.session?.refreshToken
    if (!refreshToken) {
      throw new Error('Aucune session a rafraichir.')
    }

    const session = await withTimeout(
      apiRequest<AuthSession>('/auth/refresh', {
        method: 'POST',
        body: {
          refreshToken
        }
      }),
      4000
    )

    applySession(session, true)
    return cloneSession(session)
  }

  logout() {
    clearAuthState()
    clearStoredSession()
  }
}

export default new AuthService()
