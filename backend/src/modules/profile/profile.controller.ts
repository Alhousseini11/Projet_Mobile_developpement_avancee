import { Prisma, ReservationStatus, Role } from '@prisma/client';
import { Request, Response } from 'express';
import { DEMO_ACCOUNT } from '../../config/demo';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { prisma } from '../../data/prisma/client';
import { createStripeClient } from '../../data/stripe/stripeClient';
import { AppError } from '../../shared/errors';
import { isCurrentVehicleSchemaAvailable } from '../_shared/schemaCapabilities';
import {
  resolveOptionalRequestUser,
  type AuthenticatedUser
} from '../auth/auth.service';
import { getReservationCountForUser } from '../reservations/reservations.controller';
import { buildReservationServiceMap } from '../reservations/reservationServices.store';

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

interface ProfileUpdatePayload {
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  preferredGarage?: unknown;
  addressLine?: unknown;
  city?: unknown;
  notes?: unknown;
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

const DEFAULT_TAX_RATE = 0.15;

const defaultProfileState: ProfilePayload = {
  id: 'demo-user',
  fullName: DEMO_ACCOUNT.fullName,
  email: DEMO_ACCOUNT.email,
  phone: DEMO_ACCOUNT.phone,
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

const defaultInvoices: InvoicePayload[] = [
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

function hasOwnProperty(value: object, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function normalizeProfileUpdatePayload(value: unknown): ProfileUpdatePayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as ProfileUpdatePayload;
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalDate(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeOptionalInteger(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : Math.max(0, parsed);
  }

  return null;
}

function cloneInvoice(invoice: InvoicePayload): InvoicePayload {
  return {
    ...invoice,
    lineItems: invoice.lineItems.map(lineItem => ({ ...lineItem }))
  };
}

function isStripeConfigured() {
  return env.STRIPE_KEY.trim().length > 0;
}

function getStripeSuccessUrl() {
  return env.STRIPE_SUCCESS_URL || 'https://example.com/garage/stripe/success?session_id={CHECKOUT_SESSION_ID}';
}

function getStripeCancelUrl() {
  return env.STRIPE_CANCEL_URL || 'https://example.com/garage/stripe/cancel';
}

function buildPaymentMessage(status: PaymentMethodPayload['status'], card: PaymentCardPayload | null) {
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

function normalizePaymentStatus(
  value?: string | null
): PaymentMethodPayload['status'] {
  if (value === 'pending' || value === 'ready') {
    return value;
  }

  return 'not_configured';
}

function serializePaymentMethod(record?: {
  stripeRef: string;
  status: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  lastCheckoutSessionId: string | null;
  lastSyncAt: Date | null;
} | null): PaymentMethodPayload {
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

function getInvoiceSummaries(invoices: InvoicePayload[]) {
  return invoices.map(invoice => ({
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

function findInvoiceById(invoices: InvoicePayload[], invoiceId: string) {
  return invoices.find(invoice => invoice.id === invoiceId) ?? null;
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

function toProfileUser(user: {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  createdAt: Date;
}): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt
  };
}

async function resolveProfileUser(req: Request) {
  const authenticatedUser = await resolveOptionalRequestUser(req);
  if (authenticatedUser) {
    return authenticatedUser;
  }

  throw new AppError('Authentification requise.', 401);
}

async function countVehicles(userId: string) {
  if (await isCurrentVehicleSchemaAvailable()) {
    return prisma.vehicle.count({ where: { userId } }).catch(() => 0);
  }

  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS "count"
    FROM "Vehicle"
    WHERE "userId" = ${userId}
  `;

  return Number(rows[0]?.count ?? 0);
}

async function findDefaultVehicleLabel(userId: string) {
  if (await isCurrentVehicleSchemaAvailable()) {
    const vehicle = await prisma.vehicle
      .findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      })
      .catch(() => null);

    return vehicle ? `${vehicle.name} ${vehicle.model}` : null;
  }

  const rows = await prisma.$queryRaw<Array<{ name: string; model: string }>>`
    SELECT "name", "model"
    FROM "Vehicle"
    WHERE "userId" = ${userId}
    ORDER BY "id" DESC
    LIMIT 1
  `;

  const vehicle = rows[0];
  return vehicle ? `${vehicle.name} ${vehicle.model}` : null;
}

async function buildProfileResponseForUser(
  authenticatedUser: AuthenticatedUser
): Promise<ProfilePayload> {
  const [settings, vehicleCount, appointmentCount, detectedVehicleLabel] = await Promise.all([
    prisma.userProfileSettings.findUnique({
      where: { userId: authenticatedUser.id }
    }),
    countVehicles(authenticatedUser.id).catch(() => 0),
    getReservationCountForUser(authenticatedUser.id, authenticatedUser.email).catch(() => 0),
    findDefaultVehicleLabel(authenticatedUser.id).catch(() => null)
  ]);

  const memberSince = settings?.memberSince ?? authenticatedUser.createdAt;
  const defaultVehicleLabel =
    settings?.defaultVehicleLabel ??
    detectedVehicleLabel ??
    'Aucun vehicule';

  return {
    id: authenticatedUser.id,
    fullName: authenticatedUser.fullName,
    email: authenticatedUser.email,
    phone: authenticatedUser.phone ?? defaultProfileState.phone,
    membershipLabel: settings?.membershipLabel ?? mapMembershipLabel(authenticatedUser.role),
    verified: settings?.verified ?? true,
    memberSince: memberSince.toISOString().slice(0, 10),
    preferredGarage: settings?.preferredGarage ?? 'Garage Montreal Centre',
    defaultVehicleLabel,
    appointmentCount,
    vehicleCount,
    loyaltyPoints: settings?.loyaltyPoints ?? appointmentCount * 60 + vehicleCount * 30,
    addressLine: settings?.addressLine ?? 'Adresse a completer',
    city: settings?.city ?? 'Montreal, QC',
    notes: settings?.notes ?? 'Compte client connecte via authentification backend.'
  };
}

async function getPaymentSummaryForUser(userId?: string | null) {
  if (!userId) {
    return serializePaymentMethod(null);
  }

  const paymentMethod = await prisma.paymentMethod.findUnique({
    where: { userId },
    select: {
      stripeRef: true,
      status: true,
      brand: true,
      last4: true,
      expMonth: true,
      expYear: true,
      lastCheckoutSessionId: true,
      lastSyncAt: true
    }
  });

  return serializePaymentMethod(paymentMethod);
}

function buildReservationInvoiceAmounts(
  amount: Prisma.Decimal,
  servicePrice?: number | null
) {
  const totalAmount = Number(amount);

  if (typeof servicePrice === 'number') {
    const subtotalAmount = Number(servicePrice.toFixed(2));
    const taxAmount = Number((totalAmount - subtotalAmount).toFixed(2));

    return {
      subtotalAmount,
      taxAmount: Number.isFinite(taxAmount) ? taxAmount : 0,
      totalAmount: Number(totalAmount.toFixed(2))
    };
  }

  const normalizedTotal = Number(totalAmount.toFixed(2));
  const subtotalAmount = Number((normalizedTotal / (1 + DEFAULT_TAX_RATE)).toFixed(2));
  const taxAmount = Number((normalizedTotal - subtotalAmount).toFixed(2));

  return {
    subtotalAmount,
    taxAmount,
    totalAmount: normalizedTotal
  };
}

function buildInvoiceNumber(reservationId: string, issuedAt: Date) {
  const suffix = reservationId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || '000000';
  return `INV-${issuedAt.getUTCFullYear()}-${suffix}`;
}

async function buildInvoicesForUser(user: AuthenticatedUser) {
  await getReservationCountForUser(user.id, user.email);

  const [reservations, settings, detectedVehicleLabel] = await Promise.all([
    prisma.reservation.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: 'desc' }, { scheduledAt: 'desc' }],
      select: {
        id: true,
        serviceType: true,
        scheduledAt: true,
        amount: true,
        currency: true,
        status: true,
        createdAt: true
      }
    }),
    prisma.userProfileSettings.findUnique({
      where: { userId: user.id },
      select: {
        defaultVehicleLabel: true
      }
    }),
    findDefaultVehicleLabel(user.id).catch(() => null)
  ]);

  const vehicleLabel =
    settings?.defaultVehicleLabel ??
    detectedVehicleLabel ??
    'Aucun vehicule';
  const serviceMap = await buildReservationServiceMap(
    reservations.map(reservation => reservation.serviceType)
  );

  return reservations.map(reservation => {
    const service = serviceMap.get(reservation.serviceType);
    const serviceLabel = service?.label ?? reservation.serviceType;
    const pricing = buildReservationInvoiceAmounts(reservation.amount, service?.price);
    const issuedAt = reservation.createdAt.toISOString().slice(0, 10);
    const appointmentDate = reservation.scheduledAt.toISOString().slice(0, 10);
    const paymentStatus =
      reservation.status === ReservationStatus.PAID ||
      reservation.status === ReservationStatus.COMPLETED
        ? 'paid'
        : 'pending';
    const paymentLabel =
      paymentStatus === 'paid' ? 'Paiement Stripe' : 'A regler sur place';
    const lineItemLabel = service ? `Forfait ${service.label.toLowerCase()}` : serviceLabel;

    return {
      id: `invoice-${reservation.id}`,
      number: buildInvoiceNumber(reservation.id, reservation.createdAt),
      serviceLabel,
      issuedAt,
      appointmentDate,
      vehicleLabel,
      subtotalAmount: pricing.subtotalAmount,
      taxAmount: pricing.taxAmount,
      totalAmount: pricing.totalAmount,
      currency: reservation.currency,
      status: paymentStatus,
      paymentLabel,
      lineItems: [
        {
          label: lineItemLabel,
          quantity: 1,
          unitPrice: pricing.subtotalAmount,
          totalPrice: pricing.subtotalAmount
        }
      ]
    } satisfies InvoicePayload;
  });
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

export async function getProfile(req: Request, res: Response) {
  const authenticatedUser = await resolveProfileUser(req);
  res.json(await buildProfileResponseForUser(authenticatedUser));
}

export async function updateProfile(req: Request, res: Response) {
  const body = normalizeProfileUpdatePayload(req.body);
  const authenticatedUser = await resolveProfileUser(req);

  let nextUser = authenticatedUser;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: authenticatedUser.id },
      data: {
        fullName:
          typeof body.fullName === 'string' && body.fullName.trim()
            ? body.fullName.trim()
            : authenticatedUser.fullName,
        email:
          typeof body.email === 'string' && body.email.trim()
            ? body.email.trim().toLowerCase()
            : authenticatedUser.email,
        phone:
          typeof body.phone === 'string'
            ? body.phone.trim() || null
            : authenticatedUser.phone
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        createdAt: true
      }
    });

    nextUser = toProfileUser(updatedUser);
  } catch {
    res.status(409).json({
      message: 'Impossible de mettre a jour ce profil.'
    });
    return;
  }

  const settingsData: Prisma.UserProfileSettingsUncheckedUpdateInput = {};

  if (hasOwnProperty(body, 'preferredGarage')) {
    settingsData.preferredGarage = normalizeOptionalText(body.preferredGarage);
  }

  if (hasOwnProperty(body, 'addressLine')) {
    settingsData.addressLine = normalizeOptionalText(body.addressLine);
  }

  if (hasOwnProperty(body, 'city')) {
    settingsData.city = normalizeOptionalText(body.city);
  }

  if (hasOwnProperty(body, 'notes')) {
    settingsData.notes = normalizeOptionalText(body.notes);
  }

  if (Object.keys(settingsData).length > 0) {
    await prisma.userProfileSettings.upsert({
      where: { userId: nextUser.id },
      update: settingsData,
      create: {
        userId: nextUser.id,
        preferredGarage: settingsData.preferredGarage as string | null | undefined,
        addressLine: settingsData.addressLine as string | null | undefined,
        city: settingsData.city as string | null | undefined,
        notes: settingsData.notes as string | null | undefined
      }
    });
  }

  res.json(await buildProfileResponseForUser(nextUser));
}

export async function getPaymentMethod(req: Request, res: Response) {
  const authenticatedUser = await resolveProfileUser(req);
  res.json(await getPaymentSummaryForUser(authenticatedUser?.id));
}

export async function listInvoices(req: Request, res: Response) {
  const authenticatedUser = await resolveProfileUser(req);
  const invoices = await buildInvoicesForUser(authenticatedUser);
  res.json(getInvoiceSummaries(invoices));
}

export async function downloadInvoicePdf(req: Request, res: Response) {
  const authenticatedUser = await resolveProfileUser(req);
  const invoices = await buildInvoicesForUser(authenticatedUser);
  const invoice = findInvoiceById(invoices, req.params.invoiceId);

  if (!invoice) {
    return res.status(404).json({
      message: 'Invoice not found'
    });
  }

  const profile = await buildProfileResponseForUser(authenticatedUser);
  const pdfBuffer = buildInvoicePdf(
    invoice,
    profile,
    await getPaymentSummaryForUser(authenticatedUser.id)
  );
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

    await prisma.paymentMethod.upsert({
      where: { userId: profile.id },
      update: {
        provider: 'stripe',
        status: 'pending',
        stripeRef: customerId,
        lastCheckoutSessionId: session.id,
        lastSyncAt: new Date()
      },
      create: {
        userId: profile.id,
        provider: 'stripe',
        status: 'pending',
        stripeRef: customerId,
        lastCheckoutSessionId: session.id,
        lastSyncAt: new Date()
      }
    });

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
      await prisma.paymentMethod.upsert({
        where: { userId: authenticatedUser.id },
        update: {
          provider: 'stripe',
          status: 'pending',
          stripeRef: customerId,
          lastCheckoutSessionId: session.id,
          lastSyncAt: new Date()
        },
        create: {
          userId: authenticatedUser.id,
          provider: 'stripe',
          status: 'pending',
          stripeRef: customerId,
          lastCheckoutSessionId: session.id,
          lastSyncAt: new Date()
        }
      });

      return res.status(202).json(await getPaymentSummaryForUser(authenticatedUser.id));
    }

    const setupIntent = session.setup_intent;
    if (!setupIntent || typeof setupIntent === 'string') {
      await prisma.paymentMethod.upsert({
        where: { userId: authenticatedUser.id },
        update: {
          provider: 'stripe',
          status: 'pending',
          stripeRef: customerId,
          lastCheckoutSessionId: session.id,
          lastSyncAt: new Date()
        },
        create: {
          userId: authenticatedUser.id,
          provider: 'stripe',
          status: 'pending',
          stripeRef: customerId,
          lastCheckoutSessionId: session.id,
          lastSyncAt: new Date()
        }
      });

      return res.status(202).json(await getPaymentSummaryForUser(authenticatedUser.id));
    }

    const paymentMethod = setupIntent.payment_method;
    if (
      !paymentMethod ||
      typeof paymentMethod === 'string' ||
      paymentMethod.type !== 'card' ||
      !paymentMethod.card
    ) {
      await prisma.paymentMethod.upsert({
        where: { userId: authenticatedUser.id },
        update: {
          provider: 'stripe',
          status: 'pending',
          stripeRef: customerId,
          lastCheckoutSessionId: session.id,
          lastSyncAt: new Date()
        },
        create: {
          userId: authenticatedUser.id,
          provider: 'stripe',
          status: 'pending',
          stripeRef: customerId,
          lastCheckoutSessionId: session.id,
          lastSyncAt: new Date()
        }
      });

      return res.status(202).json(await getPaymentSummaryForUser(authenticatedUser.id));
    }

    await prisma.paymentMethod.upsert({
      where: { userId: authenticatedUser.id },
      update: {
        provider: 'stripe',
        status: 'ready',
        stripeRef: customerId,
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        expMonth: paymentMethod.card.exp_month,
        expYear: paymentMethod.card.exp_year,
        lastCheckoutSessionId: session.id,
        lastSyncAt: new Date()
      },
      create: {
        userId: authenticatedUser.id,
        provider: 'stripe',
        status: 'ready',
        stripeRef: customerId,
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        expMonth: paymentMethod.card.exp_month,
        expYear: paymentMethod.card.exp_year,
        lastCheckoutSessionId: session.id,
        lastSyncAt: new Date()
      }
    });

    return res.json(await getPaymentSummaryForUser(authenticatedUser.id));
  } catch (error) {
    logger.error({ err: error }, 'Stripe payment method sync failed');
    return res.status(502).json({
      message: error instanceof Error ? error.message : 'Stripe payment method sync failed'
    });
  }
}

export const __profileControllerInternals = {
  normalizeOptionalText,
  normalizeOptionalDate,
  normalizeOptionalInteger,
  cloneInvoice,
  buildPaymentMessage,
  normalizePaymentStatus,
  serializePaymentMethod,
  getInvoiceSummaries,
  findInvoiceById,
  escapePdfText,
  formatPdfAmount,
  buildPdfDocument,
  buildInvoicePdf,
  mapMembershipLabel,
  buildReservationInvoiceAmounts,
  buildInvoiceNumber
};
