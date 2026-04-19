import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(process.cwd(), '.env')
});

type RuntimeMode = 'development' | 'test' | 'production';

function readBooleanEnv(value: string | undefined, fallback: boolean) {
  if (typeof value !== 'string') {
    return fallback;
  }

  switch (value.trim().toLowerCase()) {
    case '1':
    case 'true':
    case 'yes':
    case 'on':
      return true;
    case '0':
    case 'false':
    case 'no':
    case 'off':
      return false;
    default:
      return fallback;
  }
}

function readStringEnv(value: string | undefined, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim();
}

function normalizeNodeEnv(value: string | undefined): RuntimeMode {
  switch (readStringEnv(value, 'development').toLowerCase()) {
    case 'production':
      return 'production';
    case 'test':
      return 'test';
    default:
      return 'development';
  }
}

function buildMissingEnvMessage(name: string, productionOnly: boolean) {
  if (productionOnly) {
    return `Missing required environment variable "${name}" in production. Set it before starting the backend.`;
  }

  return `Missing required environment variable "${name}". Set it before using the backend feature that depends on it.`;
}

const nodeEnv = normalizeNodeEnv(process.env.NODE_ENV);

export function isProductionEnvironment() {
  return nodeEnv === 'production';
}

export function requireEnv(name: string) {
  const value = readStringEnv(process.env[name]);

  if (!value) {
    throw new Error(buildMissingEnvMessage(name, false));
  }

  return value;
}

export function requireEnvInProduction(name: string) {
  const value = readStringEnv(process.env[name]);

  if (!value && isProductionEnvironment()) {
    throw new Error(buildMissingEnvMessage(name, true));
  }

  return value;
}

export const env = {
  NODE_ENV: nodeEnv,
  PORT: Number(process.env.PORT || 3000),
  DATABASE_URL: readStringEnv(process.env.DATABASE_URL),
  JWT_SECRET: readStringEnv(process.env.JWT_SECRET),
  SENDGRID_ENABLED: readBooleanEnv(process.env.SENDGRID_ENABLED, false),
  SENDGRID_API_KEY: readStringEnv(process.env.SENDGRID_API_KEY),
  SENDGRID_FROM_EMAIL: readStringEnv(process.env.SENDGRID_FROM_EMAIL),
  SENDGRID_FROM_NAME: readStringEnv(process.env.SENDGRID_FROM_NAME, 'Garage Mechanic'),
  PASSWORD_RESET_URL: readStringEnv(process.env.PASSWORD_RESET_URL),
  STRIPE_KEY: readStringEnv(process.env.STRIPE_KEY),
  STRIPE_SUCCESS_URL: readStringEnv(process.env.STRIPE_SUCCESS_URL),
  STRIPE_CANCEL_URL: readStringEnv(process.env.STRIPE_CANCEL_URL),
  PUBLIC_BASE_URL: readStringEnv(process.env.PUBLIC_BASE_URL),
  S3_BUCKET: readStringEnv(process.env.S3_BUCKET),
  GOOGLE_MAPS_KEY: readStringEnv(process.env.GOOGLE_MAPS_KEY),
  DEMO_MODE: readBooleanEnv(process.env.DEMO_MODE, false)
};

export function validateRuntimeEnv() {
  const validationErrors: string[] = [];

  for (const validator of [
    () => requireEnvInProduction('DATABASE_URL'),
    () => requireEnvInProduction('JWT_SECRET')
  ]) {
    try {
      validator();
    } catch (error) {
      validationErrors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (isProductionEnvironment() && env.DEMO_MODE) {
    validationErrors.push('DEMO_MODE must stay disabled in production.');
  }

  if (validationErrors.length > 0) {
    throw new Error(
      [
        'Backend configuration is invalid for the current environment.',
        `NODE_ENV=${env.NODE_ENV}`,
        ...validationErrors
      ].join('\n')
    );
  }
}
