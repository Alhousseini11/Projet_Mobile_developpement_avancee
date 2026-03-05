import * as dotenv from 'dotenv';
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 3000),
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'change-me',
  STRIPE_KEY: process.env.STRIPE_KEY || '',
  S3_BUCKET: process.env.S3_BUCKET || '',
  GOOGLE_MAPS_KEY: process.env.GOOGLE_MAPS_KEY || '',
};
