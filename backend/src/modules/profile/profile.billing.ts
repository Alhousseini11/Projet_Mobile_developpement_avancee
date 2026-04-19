import { Prisma, ReservationStatus } from '../../data/prisma/generatedClient';
import { Request, Response } from 'express';
import { prisma } from '../../data/prisma/client';
import type { AuthenticatedUser } from '../auth/auth.service';
import { buildReservationServiceMap } from '../reservations/reservationServices.store';
import type {
  InvoicePayload,
  PaymentMethodPayload,
  ProfilePayload
} from './profile.contracts';
import {
  buildProfileResponseForUser,
  findDefaultVehicleLabel,
  resolveProfileUser
} from './profile.core';
import { getPaymentSummaryForUser } from './profile.payments';

const DEFAULT_TAX_RATE = 0.15;

export function cloneInvoice(invoice: InvoicePayload): InvoicePayload {
  return {
    ...invoice,
    lineItems: invoice.lineItems.map(lineItem => ({ ...lineItem }))
  };
}

export function getInvoiceSummaries(invoices: InvoicePayload[]) {
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

export function findInvoiceById(invoices: InvoicePayload[], invoiceId: string) {
  return invoices.find(invoice => invoice.id === invoiceId) ?? null;
}

export function escapePdfText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r?\n/g, ' ');
}

export function formatPdfAmount(amount: number, currency: string) {
  return `${amount.toFixed(2)} ${currency}`;
}

export function buildPdfDocument(lines: string[]) {
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

export function buildInvoicePdf(
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

export function buildReservationInvoiceAmounts(
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

export function buildInvoiceNumber(reservationId: string, issuedAt: Date) {
  const suffix = reservationId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || '000000';
  return `INV-${issuedAt.getUTCFullYear()}-${suffix}`;
}

async function buildInvoicesForUser(user: AuthenticatedUser) {
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

export const __profileBillingInternals = {
  cloneInvoice,
  getInvoiceSummaries,
  findInvoiceById,
  escapePdfText,
  formatPdfAmount,
  buildPdfDocument,
  buildInvoicePdf,
  buildReservationInvoiceAmounts,
  buildInvoiceNumber
};
