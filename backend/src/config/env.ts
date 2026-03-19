import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '..', '..', '.env')
});

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

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 3000),
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'change-me',
  STRIPE_KEY: process.env.STRIPE_KEY || '',
  STRIPE_SUCCESS_URL: process.env.STRIPE_SUCCESS_URL || '',
  STRIPE_CANCEL_URL: process.env.STRIPE_CANCEL_URL || '',
  S3_BUCKET: process.env.S3_BUCKET || '',
  GOOGLE_MAPS_KEY: process.env.GOOGLE_MAPS_KEY || '',
  DEMO_MODE: readBooleanEnv(process.env.DEMO_MODE, true)
};
