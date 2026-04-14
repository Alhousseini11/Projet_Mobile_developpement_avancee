import { Request, Response } from 'express';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { prisma } from '../../data/prisma/client';
import { createStripeClient } from '../../data/stripe/stripeClient';
import type {
  PaymentCardPayload,
  PaymentMethodPayload,
  ProfilePayload
} from './profile.contracts';
import {
  buildProfileResponseForUser,
  resolveProfileUser
} from './profile.core';

type PaymentMethodRecord = {
  stripeRef: string;
  status: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  lastCheckoutSessionId: string | null;
  lastSyncAt: Date | null;
};

const paymentMethodSummarySelect = {
  stripeRef: true,
  status: true,
  brand: true,
  last4: true,
  expMonth: true,
  expYear: true,
  lastCheckoutSessionId: true,
  lastSyncAt: true
} as const;

function isStripeConfigured() {
  return env.STRIPE_KEY.trim().length > 0;
}

function getStripeSuccessUrl() {
  return env.STRIPE_SUCCESS_URL || 'https://example.com/garage/stripe/success?session_id={CHECKOUT_SESSION_ID}';
}

function getStripeCancelUrl() {
  return env.STRIPE_CANCEL_URL || 'https://example.com/garage/stripe/cancel';
}

export function buildPaymentMessage(
  status: PaymentMethodPayload['status'],
  card: PaymentCardPayload | null
) {
  if (!isStripeConfigured()) {
    return 'Ajoutez une cle Stripe cote backend pour activer le paiement.';
  }

  if (status === 'ready' && card) {
    return 'Carte Stripe synchronisee et prete pour les prochains paiements.';
  }

  if (status === 'pending') {
    return 'Session Stripe ouverte. Finalisez la configuration puis revenez synchroniser.';
  }

  return 'Aucun moyen de paiement Stripe enregistre.';
}

export function normalizePaymentStatus(
  value?: string | null
): PaymentMethodPayload['status'] {
  if (value === 'pending' || value === 'ready') {
    return value;
  }

  return 'not_configured';
}

export function serializePaymentMethod(record?: PaymentMethodRecord | null): PaymentMethodPayload {
  const card =
    record?.brand && record.last4 && record.expMonth && record.expYear
      ? {
          brand: record.brand,
          last4: record.last4,
          expMonth: record.expMonth,
          expYear: record.expYear
        }
      : null;

  const status = normalizePaymentStatus(record?.status);

  return {
    provider: 'stripe',
    status,
    backendReachable: true,
    stripeConfigured: isStripeConfigured(),
    customerId: record?.stripeRef ?? null,
    card,
    lastCheckoutSessionId: record?.lastCheckoutSessionId ?? null,
    lastSyncAt: record?.lastSyncAt?.toISOString() ?? null,
    message: buildPaymentMessage(status, card)
  };
}

export async function getPaymentSummaryForUser(userId?: string | null) {
  if (!userId) {
    return serializePaymentMethod(null);
  }

  const paymentMethod = await prisma.paymentMethod.findUnique({
    where: { userId },
    select: paymentMethodSummarySelect
  });

  return serializePaymentMethod(paymentMethod);
}

async function ensureStripeCustomer(profile: ProfilePayload) {
  const existing = await prisma.paymentMethod.findUnique({
    where: { userId: profile.id },
    select: {
      stripeRef: true
    }
  });

  if (existing?.stripeRef) {
    return existing.stripeRef;
  }

  const stripe = createStripeClient();
  const customer = await stripe.customers.create({
    email: profile.email,
    name: profile.fullName,
    phone: profile.phone,
    metadata: {
      userId: profile.id
    }
  });

  await prisma.paymentMethod.upsert({
    where: { userId: profile.id },
    update: {
      provider: 'stripe',
      stripeRef: customer.id
    },
    create: {
      userId: profile.id,
      provider: 'stripe',
      status: 'not_configured',
      stripeRef: customer.id
    }
  });

  return customer.id;
}

async function upsertPendingPaymentMethod(userId: string, customerId: string, sessionId: string) {
  const pendingPaymentMethod = {
    provider: 'stripe' as const,
    status: 'pending' as const,
    stripeRef: customerId,
    lastCheckoutSessionId: sessionId,
    lastSyncAt: new Date()
  };

  await prisma.paymentMethod.upsert({
    where: { userId },
    update: pendingPaymentMethod,
    create: {
      userId,
      ...pendingPaymentMethod
    }
  });
}

async function upsertReadyPaymentMethod(
  userId: string,
  customerId: string,
  sessionId: string,
  card: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  }
) {
  const readyPaymentMethod = {
    provider: 'stripe' as const,
    status: 'ready' as const,
    stripeRef: customerId,
    brand: card.brand,
    last4: card.last4,
    expMonth: card.expMonth,
    expYear: card.expYear,
    lastCheckoutSessionId: sessionId,
    lastSyncAt: new Date()
  };

  await prisma.paymentMethod.upsert({
    where: { userId },
    update: readyPaymentMethod,
    create: {
      userId,
      ...readyPaymentMethod
    }
  });
}

export async function getPaymentMethod(req: Request, res: Response) {
  const authenticatedUser = await resolveProfileUser(req);
  res.json(await getPaymentSummaryForUser(authenticatedUser.id));
}

export async function createPaymentCheckoutSession(req: Request, res: Response) {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({
        message: 'Stripe is not configured. Add STRIPE_KEY to backend/.env'
      });
    }

    const authenticatedUser = await resolveProfileUser(req);
    const profile = await buildProfileResponseForUser(authenticatedUser);
    const stripe = createStripeClient();
    const customerId = await ensureStripeCustomer(profile);
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customerId,
      currency: 'cad',
      success_url: getStripeSuccessUrl(),
      cancel_url: getStripeCancelUrl(),
      metadata: {
        userId: profile.id
      }
    });

    if (!session.url) {
      return res.status(500).json({
        message: 'Stripe session URL was not returned'
      });
    }

    await upsertPendingPaymentMethod(profile.id, customerId, session.id);

    return res.status(201).json({
      sessionId: session.id,
      url: session.url,
      mode: 'setup'
    });
  } catch (error) {
    logger.error({ err: error }, 'Stripe checkout session creation failed');
    return res.status(502).json({
      message: error instanceof Error ? error.message : 'Stripe checkout session creation failed'
    });
  }
}

export async function syncPaymentMethod(req: Request, res: Response) {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({
        message: 'Stripe is not configured. Add STRIPE_KEY to backend/.env'
      });
    }

    const authenticatedUser = await resolveProfileUser(req);
    const existingState = await prisma.paymentMethod.findUnique({
      where: { userId: authenticatedUser.id }
    });

    const requestedSessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : null;
    const sessionId = requestedSessionId || existingState?.lastCheckoutSessionId;

    if (!sessionId) {
      return res.status(400).json({
        message: 'No Stripe checkout session is available to sync'
      });
    }

    const stripe = createStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['setup_intent.payment_method', 'customer']
    });

    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id ?? existingState?.stripeRef ?? null;

    if (!customerId) {
      return res.status(400).json({
        message: 'No Stripe customer is associated with this session'
      });
    }

    if (session.status !== 'complete') {
      await upsertPendingPaymentMethod(authenticatedUser.id, customerId, session.id);
      return res.status(202).json(await getPaymentSummaryForUser(authenticatedUser.id));
    }

    const setupIntent = session.setup_intent;
    if (!setupIntent || typeof setupIntent === 'string') {
      await upsertPendingPaymentMethod(authenticatedUser.id, customerId, session.id);
      return res.status(202).json(await getPaymentSummaryForUser(authenticatedUser.id));
    }

    const paymentMethod = setupIntent.payment_method;
    if (
      !paymentMethod ||
      typeof paymentMethod === 'string' ||
      paymentMethod.type !== 'card' ||
      !paymentMethod.card
    ) {
      await upsertPendingPaymentMethod(authenticatedUser.id, customerId, session.id);
      return res.status(202).json(await getPaymentSummaryForUser(authenticatedUser.id));
    }

    await upsertReadyPaymentMethod(authenticatedUser.id, customerId, session.id, {
      brand: paymentMethod.card.brand,
      last4: paymentMethod.card.last4,
      expMonth: paymentMethod.card.exp_month,
      expYear: paymentMethod.card.exp_year
    });

    return res.json(await getPaymentSummaryForUser(authenticatedUser.id));
  } catch (error) {
    logger.error({ err: error }, 'Stripe payment method sync failed');
    return res.status(502).json({
      message: error instanceof Error ? error.message : 'Stripe payment method sync failed'
    });
  }
}

export const __profilePaymentsInternals = {
  buildPaymentMessage,
  normalizePaymentStatus,
  serializePaymentMethod
};
