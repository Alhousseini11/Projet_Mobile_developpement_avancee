import type { ApiErrorPayload, AuthSession } from './types';

const STORAGE_KEY = 'garage.admin.web.session';

let session: AuthSession | null = loadSession();

function normalizeApiBase(value: string) {
  return value.replace(/\/+$/g, '').replace(/\/api$/i, '');
}

export const API_URL = normalizeApiBase(import.meta.env.VITE_API_URL || 'http://localhost:3000');

export function getSession() {
  return session;
}

export function saveSession(nextSession: AuthSession | null) {
  session = nextSession;

  if (nextSession) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

function loadSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

async function parseJson<T>(response: Response) {
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : null;
}

async function refreshSession() {
  if (!session?.refreshToken) {
    return false;
  }

  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      refreshToken: session.refreshToken
    })
  });

  if (!response.ok) {
    saveSession(null);
    return false;
  }

  const payload = await parseJson<AuthSession>(response);
  if (!payload) {
    saveSession(null);
    return false;
  }

  saveSession(payload);
  return true;
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    retryOnUnauthorized?: boolean;
  } = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(session?.accessToken ? { authorization: `Bearer ${session.accessToken}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 401 && options.retryOnUnauthorized !== false) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiRequest<T>(path, {
        ...options,
        retryOnUnauthorized: false
      });
    }
  }

  const payload = await parseJson<T | ApiErrorPayload>(response);
  if (!response.ok) {
    throw new Error((payload as ApiErrorPayload | null)?.message || 'Requete admin invalide.');
  }

  return payload as T;
}
