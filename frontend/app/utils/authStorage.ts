import { ApplicationSettings } from '@nativescript/core'
import type { AuthSession } from '@/types/auth'

export const SESSION_STORAGE_KEY = 'garage.auth.session'
let currentSession: AuthSession | null = null

export function readStoredSession(): AuthSession | null {
  if (currentSession) {
    return currentSession
  }

  const rawSession = ApplicationSettings.getString(SESSION_STORAGE_KEY)
  if (!rawSession) {
    return null
  }

  try {
    currentSession = JSON.parse(rawSession) as AuthSession
    return currentSession
  } catch (error) {
    console.error('Unable to parse stored auth session:', error)
    ApplicationSettings.remove(SESSION_STORAGE_KEY)
    currentSession = null
    return null
  }
}

export function writeStoredSession(session: AuthSession | null, persist = true) {
  currentSession = session

  if (!session) {
    ApplicationSettings.remove(SESSION_STORAGE_KEY)
    return
  }

  if (persist) {
    ApplicationSettings.setString(SESSION_STORAGE_KEY, JSON.stringify(session))
  } else {
    ApplicationSettings.remove(SESSION_STORAGE_KEY)
  }
}

export function clearStoredSession() {
  currentSession = null
  ApplicationSettings.remove(SESSION_STORAGE_KEY)
}

export function getStoredAccessToken() {
  return readStoredSession()?.accessToken ?? null
}
