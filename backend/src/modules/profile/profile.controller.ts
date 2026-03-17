import { Role } from '@prisma/client';
import { Request, Response } from 'express';
import { env } from '../../config/env';
import { prisma } from '../../data/prisma/client';
import { createStripeClient } from '../../data/stripe/stripeClient';
import { resolveOptionalRequestUser } from '../auth/auth.service';

interface ProfilePayload {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  membershipLabel: string;
  verified: boolean;
  memberSince: string;
  preferredGarage: string;
  defaultVehicleLabel: string;
  appointmentCount: number;
  vehicleCount: number;
  loyaltyPoints: number;
  addressLine: string;
  city: string;
  notes: string;
}

interface PaymentCardPayload {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

interface PaymentMethodPayload {
  provider: 'stripe';
  status: 'not_configured' | 'pending' | 'ready';
  backendReachable: boolean;
  stripeConfigured: boolean;
  customerId: string | null;
  card: PaymentCardPayload | null;
  lastCheckoutSessionId: string | null;
  lastSyncAt: string | null;
  message: string;
}

interface InvoiceLineItemPayload {
  label: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface InvoicePayload {
  id: string;
  number: string;
  serviceLabel: string;
  issuedAt: string;
  appointmentDate: string;
  vehicleLabel: string;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: 'paid' | 'pending';
  paymentLabel: string;
  lineItems: InvoiceLineItemPayload[];
}

const defaultProfileState: ProfilePayload = {
  id: 'demo-user',
  fullName: 'Alex Martin',
  email: 'alex.martin@example.com',
  phone: '+1 514 555 0142',
  membershipLabel: 'Client premium',
  verified: true,
  memberSince: '2024-01-12',
  preferredGarage: 'Garage Montreal Centre',
  defaultVehicleLabel: 'Peugeot 208 GT',
  appointmentCount: 2,
  vehicleCount: 1,
  loyaltyPoints: 240,
  addressLine: '245 Rue du Centre',
  city: 'Montreal, QC',
  notes: 'Preference pour les interventions en semaine le matin.'
};

const profileOverrides = new Map<string, Partial<ProfilePayload>>();
const paymentStates = new Map<string, PaymentMethodPayload>();

const demoInvoices: InvoicePayload[] = [
  {
    id: 'invoice-1001',
    number: 'INV-2026-001',
    serviceLabel: 'Vidange',
    issuedAt: '2026-03-10',
    appointmentDate: '2026-03-18',
    vehicleLabel: 'Peugeot 208 GT',
    subtotalAmount: 79,
    taxAmount: 11.86,
    totalAmount: 90.86,
    currency: 'CAD',
    status: 'paid',
    paymentLabel: 'Paiement atelier',
    lineItems: [
      {
        label: 'Forfait vidange',
        quantity: 1,
        unitPrice: 79,
        totalPrice: 79
      }
    ]
  },
  {
    id: 'invoice-1002',
    number: 'INV-2026-002',
    serviceLabel: 'Diagnostic',
    issuedAt: '2026-03-12',
    appointmentDate: '2026-03-22',
    vehicleLabel: 'Peugeot 208 GT',
    subtotalAmount: 59,
    taxAmount: 8.84,
    totalAmount: 67.84,
    currency: 'CAD',
    status: 'pending',
    paymentLabel: 'A regler sur place',
    lineItems: [
      {
        label: 'Diagnostic electronique',
        quantity: 1,
        unitPrice: 59,
        totalPrice: 59
      }
    ]
  }
];

function isStripeConfigured() {
  return env.STRIPE_KEY.trim().length > 0;
}

function getStripeSuccessUrl() {
  return env.STRIPE_SUCCESS_URL || 'https://example.com/garage/stripe/success?session_id={CHECKOUT_SESSION_ID}';
}

function getStripeCancelUrl() {
  return env.STRIPE_CANCEL_URL || 'https://example.com/garage/stripe/cancel';
}

function createDefaultPaymentState(): PaymentMethodPayload {
  return {
    provider: 'stripe',
    status: 'not_configured',
    backendReachable: true,
    stripeConfigured: false,
    customerId: null,
    card: null,
    lastCheckoutSessionId: null,
    lastSyncAt: null,
    message: 'Ajoutez une cle Stripe cote backend pour activer le paiement.'
  };
}

function getPaymentState(userId: string) {
  const existing = paymentStates.get(userId);
  if (existing) {
    return existing;
  }

  const initial = createDefaultPaymentState();
  paymentStates.set(userId, initial);
  return initial;
}

function setPaymentState(userId: string, state: PaymentMethodPayload) {
  paymentStates.set(userId, state);
  return state;
}

function buildPaymentMessage(state: PaymentMethodPayload) {
  if (!isStripeConfigured()) {
    return 'Ajoutez une cle Stripe cote backend pour activer le paiement.';
  }

  if (state.status === 'ready' && state.card) {
    return 'Carte Stripe synchronisee et prete pour les prochains paiements.';
  }

  if (state.status === 'pending') {
    return 'Session Stripe ouverte. Finalisez la configuration puis revenez synchroniser.';
  }

  return 'Aucun moyen de paiement Stripe enregistre.';
}

function getPaymentSummary(userId: string): PaymentMethodPayload {
  const state = getPaymentState(userId);

  return {
    ...state,
    backendReachable: true,
    stripeConfigured: isStripeConfigured(),
    message: buildPaymentMessage(state),
    card: state.card ? { ...state.card } : null
  };
}

function getInvoiceSummaries() {
  return demoInvoices.map(invoice => ({
    id: invoice.id,
    number: invoice.number,
    serviceLabel: invoice.serviceLabel,
    issuedAt: invoice.issuedAt,
    appointmentDate: invoice.appointmentDate,
    totalAmount: invoice.totalAmount,
    taxAmount: invoice.taxAmount,
    currency: invoice.currency,
    status: invoice.status
  }));
}

function findInvoiceById(invoiceId: string) {
  return demoInvoices.find(invoice => invoice.id === invoiceId) ?? null;
}

function escapePdfText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r?\n/g, ' ');
}

function formatPdfAmount(amount: number, currency: string) {
  return `${amount.toFixed(2)} ${currency}`;
}

function buildPdfDocument(lines: string[]) {
  const content = [
    'BT',
    '/F1 18 Tf',
    '50 780 Td',
    ...lines.flatMap((line, index) => {
      const prefix = index === 0 ? [] : ['0 -20 Td'];
      return [...prefix, `(${escapePdfText(line)}) Tj`];
    }),
    'ET'
  ].join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    `5 0 obj\n<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream\nendobj`
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${object}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${offsets[index].toString().padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

function buildInvoicePdf(
  invoice: InvoicePayload,
  profile: ProfilePayload,
  paymentState: PaymentMethodPayload
) {
  const paymentLabel = paymentState.status === 'ready' ? 'Stripe' : invoice.paymentLabel;
  const lines = [
    `Facture ${invoice.number}`,
    'Garage Montreal Centre',
    `Client: ${profile.fullName}`,
    `Email: ${profile.email}`,
    `Service: ${invoice.serviceLabel}`,
    `Vehicule: ${invoice.vehicleLabel}`,
    `Date emission: ${invoice.issuedAt}`,
    `Date rendez-vous: ${invoice.appointmentDate}`,
    `Statut: ${invoice.status === 'paid' ? 'Payee' : 'En attente'}`,
    `Paiement: ${paymentLabel}`,
    ' ',
    'Lignes facture:'
  ];

  for (const item of invoice.lineItems) {
    lines.push(
      `${item.quantity} x ${item.label} - ${formatPdfAmount(item.totalPrice, invoice.currency)}`
    );
  }

  lines.push(' ');
  lines.push(`Sous-total: ${formatPdfAmount(invoice.subtotalAmount, invoice.currency)}`);
  lines.push(`Taxes: ${formatPdfAmount(invoice.taxAmount, invoice.currency)}`);
  lines.push(`Total: ${formatPdfAmount(invoice.totalAmount, invoice.currency)}`);
  lines.push('Merci pour votre confiance.');

  return buildPdfDocument(lines);
}

function mapMembershipLabel(role: Role) {
  if (role === Role.ADMIN) {
    return 'Administrateur';
  }

  if (role === Role.MECHANIC) {
    return 'Technicien';
  }

  return 'Client';
}

async function buildProfileResponse(req: Request): Promise<ProfilePayload> {
  const authenticatedUser = await resolveOptionalRequestUser(req);
  const userId = authenticatedUser?.id ?? defaultProfileState.id;
  const override = authenticatedUser ? profileOverrides.get(userId) ?? {} : {};

  const [vehicleCount, appointmentCount, defaultVehicle] = await Promise.all([
    prisma.vehicle.count({ where: { userId } }).catch(() =>
      authenticatedUser ? 0 : defaultProfileState.vehicleCount
    ),
    prisma.reservation.count({ where: { userId } }).catch(() =>
      authenticatedUser ? 0 : defaultProfileState.appointmentCount
    ),
    prisma.vehicle
      .findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      })
      .catch(() => null)
  ]);

  if (!authenticatedUser) {
    return {
      ...defaultProfileState,
      vehicleCount: vehicleCount > 0 ? vehicleCount : defaultProfileState.vehicleCount,
      appointmentCount: appointmentCount > 0 ? appointmentCount : defaultProfileState.appointmentCount
    };
  }

  return {
    id: authenticatedUser.id,
    fullName: authenticatedUser.fullName,
    email: authenticatedUser.email,
    phone: authenticatedUser.phone ?? override.phone ?? 'A completer',
    membershipLabel: override.membershipLabel ?? mapMembershipLabel(authenticatedUser.role),
    verified: override.verified ?? true,
    memberSince: override.memberSince ?? authenticatedUser.createdAt.toISOString(),
    preferredGarage: override.preferredGarage ?? 'Garage Montreal Centre',
    defaultVehicleLabel:
      override.defaultVehicleLabel ??
      (defaultVehicle ? `${defaultVehicle.name} ${defaultVehicle.model}` : 'Aucun vehicule'),
    appointmentCount,
    vehicleCount,
    loyaltyPoints: override.loyaltyPoints ?? appointmentCount * 60 + vehicleCount * 30,
    addressLine: override.addressLine ?? 'Adresse a completer',
    city: override.city ?? 'Montreal, QC',
    notes: override.notes ?? 'Compte client connecte via authentification backend.'
  };
}

async function ensureStripeCustomer(profile: ProfilePayload) {
  const paymentState = getPaymentState(profile.id);
  if (paymentState.customerId) {
    return paymentState.customerId;
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

  setPaymentState(profile.id, {
    ...paymentState,
    customerId: customer.id
  });

  return customer.id;
}

export async function getProfile(req: Request, res: Response) {
  res.json(await buildProfileResponse(req));
}

export async function updateProfile(req: Request, res: Response) {
  const body = req.body as Partial<ProfilePayload>;
  const authenticatedUser = await resolveOptionalRequestUser(req);

  if (!authenticatedUser) {
    defaultProfileState.fullName = body.fullName ?? defaultProfileState.fullName;
    defaultProfileState.email = body.email ?? defaultProfileState.email;
    defaultProfileState.phone = body.phone ?? defaultProfileState.phone;
    defaultProfileState.membershipLabel = body.membershipLabel ?? defaultProfileState.membershipLabel;
    defaultProfileState.verified = body.verified ?? defaultProfileState.verified;
    defaultProfileState.memberSince = body.memberSince ?? defaultProfileState.memberSince;
    defaultProfileState.preferredGarage =
      body.preferredGarage ?? defaultProfileState.preferredGarage;
    defaultProfileState.defaultVehicleLabel =
      body.defaultVehicleLabel ?? defaultProfileState.defaultVehicleLabel;
    defaultProfileState.appointmentCount =
      body.appointmentCount ?? defaultProfileState.appointmentCount;
    defaultProfileState.vehicleCount = body.vehicleCount ?? defaultProfileState.vehicleCount;
    defaultProfileState.loyaltyPoints = body.loyaltyPoints ?? defaultProfileState.loyaltyPoints;
    defaultProfileState.addressLine = body.addressLine ?? defaultProfileState.addressLine;
    defaultProfileState.city = body.city ?? defaultProfileState.city;
    defaultProfileState.notes = body.notes ?? defaultProfileState.notes;

    res.json(await buildProfileResponse(req));
    return;
  }

  try {
    await prisma.user.update({
      where: { id: authenticatedUser.id },
      data: {
        fullName: body.fullName?.trim() || authenticatedUser.fullName,
        email: body.email?.trim().toLowerCase() || authenticatedUser.email,
        phone: body.phone?.trim() || authenticatedUser.phone
      }
    });
  } catch (error) {
    res.status(409).json({
      message: 'Impossible de mettre a jour ce profil.'
    });
    return;
  }

  const currentOverride = profileOverrides.get(authenticatedUser.id) ?? {};
  profileOverrides.set(authenticatedUser.id, {
    ...currentOverride,
    membershipLabel: body.membershipLabel ?? currentOverride.membershipLabel,
    verified: body.verified ?? currentOverride.verified,
    memberSince: body.memberSince ?? currentOverride.memberSince,
    preferredGarage: body.preferredGarage ?? currentOverride.preferredGarage,
    defaultVehicleLabel: body.defaultVehicleLabel ?? currentOverride.defaultVehicleLabel,
    loyaltyPoints: body.loyaltyPoints ?? currentOverride.loyaltyPoints,
    addressLine: body.addressLine ?? currentOverride.addressLine,
    city: body.city ?? currentOverride.city,
    notes: body.notes ?? currentOverride.notes
  });

  res.json(await buildProfileResponse(req));
}

export async function getPaymentMethod(req: Request, res: Response) {
  const profile = await buildProfileResponse(req);
  res.json(getPaymentSummary(profile.id));
}

export async function listInvoices(_req: Request, res: Response) {
  res.json(getInvoiceSummaries());
}

export async function downloadInvoicePdf(req: Request, res: Response) {
  const invoice = findInvoiceById(req.params.invoiceId);

  if (!invoice) {
    return res.status(404).json({
      message: 'Invoice not found'
    });
  }

  const profile = await buildProfileResponse(req);
  const pdfBuffer = buildInvoicePdf(invoice, profile, getPaymentSummary(profile.id));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${invoice.number}.pdf"`);
  return res.send(pdfBuffer);
}

export async function createPaymentCheckoutSession(req: Request, res: Response) {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({
        message: 'Stripe is not configured. Add STRIPE_KEY to backend/.env'
      });
    }

    const profile = await buildProfileResponse(req);
    const paymentState = getPaymentState(profile.id);
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

    setPaymentState(profile.id, {
      ...paymentState,
      status: 'pending',
      customerId,
      lastCheckoutSessionId: session.id,
      lastSyncAt: new Date().toISOString()
    });

    return res.status(201).json({
      sessionId: session.id,
      url: session.url,
      mode: 'setup'
    });
  } catch (error) {
    console.error('Stripe checkout session creation failed:', error);
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

    const profile = await buildProfileResponse(req);
    const paymentState = getPaymentState(profile.id);
    const stripe = createStripeClient();
    const requestedSessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : null;
    const sessionId = requestedSessionId || paymentState.lastCheckoutSessionId;

    if (!sessionId) {
      return res.status(400).json({
        message: 'No Stripe checkout session is available to sync'
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['setup_intent.payment_method', 'customer']
    });

    if (session.status !== 'complete') {
      setPaymentState(profile.id, {
        ...paymentState,
        status: 'pending',
        lastCheckoutSessionId: session.id,
        lastSyncAt: new Date().toISOString()
      });

      return res.status(202).json(getPaymentSummary(profile.id));
    }

    const setupIntent = session.setup_intent;
    if (!setupIntent || typeof setupIntent === 'string') {
      setPaymentState(profile.id, {
        ...paymentState,
        status: 'pending',
        lastCheckoutSessionId: session.id,
        lastSyncAt: new Date().toISOString()
      });

      return res.status(202).json(getPaymentSummary(profile.id));
    }

    const paymentMethod = setupIntent.payment_method;
    if (
      !paymentMethod ||
      typeof paymentMethod === 'string' ||
      paymentMethod.type !== 'card' ||
      !paymentMethod.card
    ) {
      setPaymentState(profile.id, {
        ...paymentState,
        status: 'pending',
        lastCheckoutSessionId: session.id,
        lastSyncAt: new Date().toISOString()
      });

      return res.status(202).json(getPaymentSummary(profile.id));
    }

    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id ?? paymentState.customerId;

    setPaymentState(profile.id, {
      provider: 'stripe',
      status: 'ready',
      backendReachable: true,
      stripeConfigured: true,
      customerId,
      card: {
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        expMonth: paymentMethod.card.exp_month,
        expYear: paymentMethod.card.exp_year
      },
      lastCheckoutSessionId: session.id,
      lastSyncAt: new Date().toISOString(),
      message: 'Carte Stripe synchronisee et prete pour les prochains paiements.'
    });

    return res.json(getPaymentSummary(profile.id));
  } catch (error) {
    console.error('Stripe payment method sync failed:', error);
    return res.status(502).json({
      message: error instanceof Error ? error.message : 'Stripe payment method sync failed'
    });
  }
}
