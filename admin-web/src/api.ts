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

async function parsePayload<T>(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return JSON.parse(text) as T;
  }

  return text;
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

  const payload = await parsePayload<AuthSession>(response);
  if (!payload || typeof payload === 'string') {
    saveSession(null);
    return false;
  }

  saveSession(payload);
  return true;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  formData?: FormData;
  retryOnUnauthorized?: boolean;
};

async function performRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(session?.accessToken ? { authorization: `Bearer ${session.accessToken}` } : {})
    },
    body: options.formData ?? (options.body ? JSON.stringify(options.body) : undefined)
  });

  if (response.status === 401 && options.retryOnUnauthorized !== false) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return performRequest<T>(path, {
        ...options,
        retryOnUnauthorized: false
      });
    }
  }

  const payload = await parsePayload<T | ApiErrorPayload | string>(response);
  if (!response.ok) {
    if (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string') {
      throw new Error(payload.message);
    }

    if (typeof payload === 'string' && payload.trim()) {
      throw new Error(`Reponse API invalide (${response.status}).`);
    }

    throw new Error('Requete admin invalide.');
  }

  return payload as T;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  return performRequest<T>(path, options);
}

export async function apiMultipartRequest<T>(
  path: string,
  formData: FormData,
  options: Omit<RequestOptions, 'body' | 'formData'> = {}
): Promise<T> {
  return performRequest<T>(path, {
    ...options,
    formData
  });
}
