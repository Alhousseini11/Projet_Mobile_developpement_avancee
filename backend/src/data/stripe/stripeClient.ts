import Stripe from 'stripe';
import { env } from '../../config/env';

export function createStripeClient() {
  return new Stripe(env.STRIPE_KEY, { apiVersion: '2023-10-16' });
}
