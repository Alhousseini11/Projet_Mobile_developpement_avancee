import { env } from './env';

export const DEMO_ACCOUNT = {
  email: 'alex.martin@example.com',
  password: 'Garage123!',
  fullName: 'Alex Martin',
  phone: '+1 514 555 0142'
} as const;

export function normalizeEmail(value?: string | null) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isDemoModeEnabled() {
  return env.DEMO_MODE;
}

export function isDemoUserEmail(value?: string | null) {
  return isDemoModeEnabled() && normalizeEmail(value) === DEMO_ACCOUNT.email;
}
