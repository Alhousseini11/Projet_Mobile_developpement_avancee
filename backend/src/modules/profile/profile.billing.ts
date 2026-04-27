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
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\x20-\x7E]/g, ' ')
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

type PdfFontName = 'F1' | 'F2';
type PdfRgbColor = readonly [number, number, number];

const PDF_COLOR_WHITE: PdfRgbColor = [1, 1, 1];
const PDF_COLOR_TEXT: PdfRgbColor = [0.11, 0.15, 0.2];
const PDF_COLOR_MUTED: PdfRgbColor = [0.4, 0.47, 0.56];
const PDF_COLOR_BORDER: PdfRgbColor = [0.87, 0.89, 0.93];
const PDF_COLOR_DARK: PdfRgbColor = [0.12, 0.15, 0.21];
const PDF_COLOR_RED: PdfRgbColor = [0.86, 0.15, 0.16];
const PDF_COLOR_GREEN: PdfRgbColor = [0.11, 0.54, 0.29];
const PDF_COLOR_YELLOW: PdfRgbColor = [0.79, 0.49, 0.02];
const PDF_COLOR_SURFACE: PdfRgbColor = [0.97, 0.98, 0.99];
const PDF_COLOR_HIGHLIGHT: PdfRgbColor = [1, 0.97, 0.93];

function formatPdfColor(color: PdfRgbColor) {
  return color
    .map(component => component.toFixed(3).replace(/0+$/g, '').replace(/\.$/g, '') || '0')
    .join(' ');
}

function buildPdfStreamDocument(content: string) {
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj',
    `6 0 obj\n<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream\nendobj`
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

function appendPdfText(
  commands: string[],
  x: number,
  y: number,
  text: string,
  font: PdfFontName,
  size: number,
  color: PdfRgbColor
) {
  commands.push('BT');
  commands.push(`/${font} ${size} Tf`);
  commands.push(`${formatPdfColor(color)} rg`);
  commands.push(`${x} ${y} Td`);
  commands.push(`(${escapePdfText(text)}) Tj`);
  commands.push('ET');
}

function appendPdfRectangle(
  commands: string[],
  x: number,
  y: number,
  width: number,
  height: number,
  color: PdfRgbColor
) {
  commands.push(`${formatPdfColor(color)} rg`);
  commands.push(`${x} ${y} ${width} ${height} re f`);
}

function appendPdfLine(
  commands: string[],
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: PdfRgbColor,
  width = 1
) {
  commands.push(`${width} w`);
  commands.push(`${formatPdfColor(color)} RG`);
  commands.push(`${startX} ${startY} m`);
  commands.push(`${endX} ${endY} l S`);
}

function buildInvoiceFileName(invoice: InvoicePayload) {
  return invoice.number.replace(/[^A-Za-z0-9._-]/g, '-');
}

export function buildInvoicePdf(
  invoice: InvoicePayload,
  profile: ProfilePayload,
  paymentState: PaymentMethodPayload
) {
  const paymentLabel = paymentState.status === 'ready' ? 'Stripe' : invoice.paymentLabel;
  const statusLabel = invoice.status === 'paid' ? 'Payee' : 'En attente';
  const statusColor = invoice.status === 'paid' ? PDF_COLOR_GREEN : PDF_COLOR_YELLOW;
  const commands: string[] = [];

  appendPdfRectangle(commands, 0, 676, 612, 116, PDF_COLOR_DARK);
  appendPdfRectangle(commands, 40, 700, 64, 52, PDF_COLOR_RED);
  appendPdfText(commands, 122, 742, 'Garageplus', 'F2', 24, PDF_COLOR_WHITE);
  appendPdfText(commands, 122, 720, 'Facture de rendez-vous', 'F1', 12, PDF_COLOR_WHITE);
  appendPdfText(commands, 404, 746, 'Numero', 'F1', 10, PDF_COLOR_WHITE);
  appendPdfText(commands, 404, 728, invoice.number, 'F2', 16, PDF_COLOR_WHITE);
  appendPdfRectangle(commands, 404, 694, 128, 20, statusColor);
  appendPdfText(commands, 414, 700, statusLabel, 'F2', 10, PDF_COLOR_WHITE);

  appendPdfText(commands, 40, 646, 'Client', 'F2', 14, PDF_COLOR_TEXT);
  appendPdfText(commands, 40, 626, profile.fullName, 'F2', 13, PDF_COLOR_TEXT);
  appendPdfText(commands, 40, 608, profile.email, 'F1', 11, PDF_COLOR_MUTED);
  appendPdfText(commands, 40, 592, profile.phone, 'F1', 11, PDF_COLOR_MUTED);
  appendPdfText(commands, 40, 576, `${profile.addressLine}, ${profile.city}`, 'F1', 10, PDF_COLOR_MUTED);

  appendPdfText(commands, 328, 646, 'Rendez-vous', 'F2', 14, PDF_COLOR_TEXT);
  appendPdfText(commands, 328, 626, `Service : ${invoice.serviceLabel}`, 'F1', 11, PDF_COLOR_TEXT);
  appendPdfText(commands, 328, 608, `Vehicule : ${invoice.vehicleLabel}`, 'F1', 11, PDF_COLOR_TEXT);
  appendPdfText(commands, 328, 592, `Date du rendez-vous : ${invoice.appointmentDate}`, 'F1', 11, PDF_COLOR_TEXT);
  appendPdfText(commands, 328, 576, `Date d'emission : ${invoice.issuedAt}`, 'F1', 11, PDF_COLOR_TEXT);
  appendPdfText(commands, 328, 560, `Paiement : ${paymentLabel}`, 'F1', 11, PDF_COLOR_TEXT);

  appendPdfLine(commands, 40, 540, 572, 540, PDF_COLOR_BORDER, 1);

  appendPdfRectangle(commands, 40, 500, 532, 26, PDF_COLOR_SURFACE);
  appendPdfText(commands, 52, 509, 'Description', 'F2', 10, PDF_COLOR_MUTED);
  appendPdfText(commands, 360, 509, 'Qt', 'F2', 10, PDF_COLOR_MUTED);
  appendPdfText(commands, 422, 509, 'Unitaire', 'F2', 10, PDF_COLOR_MUTED);
  appendPdfText(commands, 506, 509, 'Total', 'F2', 10, PDF_COLOR_MUTED);

  let rowY = 474;
  for (const item of invoice.lineItems) {
    appendPdfText(commands, 52, rowY, item.label, 'F1', 11, PDF_COLOR_TEXT);
    appendPdfText(commands, 364, rowY, String(item.quantity), 'F1', 11, PDF_COLOR_TEXT);
    appendPdfText(commands, 418, rowY, formatPdfAmount(item.unitPrice, invoice.currency), 'F1', 11, PDF_COLOR_TEXT);
    appendPdfText(commands, 500, rowY, formatPdfAmount(item.totalPrice, invoice.currency), 'F2', 11, PDF_COLOR_TEXT);
    appendPdfLine(commands, 40, rowY - 8, 572, rowY - 8, PDF_COLOR_BORDER, 0.75);
    rowY -= 26;
  }

  appendPdfRectangle(commands, 40, 206, 290, 94, PDF_COLOR_SURFACE);
  appendPdfText(commands, 56, 278, 'Informations utiles', 'F2', 12, PDF_COLOR_TEXT);
  appendPdfText(commands, 56, 256, 'Document genere automatiquement par Garageplus.', 'F1', 10, PDF_COLOR_MUTED);
  appendPdfText(commands, 56, 238, 'Conservez cette facture pour le suivi de vos interventions.', 'F1', 10, PDF_COLOR_MUTED);
  appendPdfText(commands, 56, 220, 'Besoin d aide ? Contactez votre garage habituel.', 'F1', 10, PDF_COLOR_MUTED);

  appendPdfRectangle(commands, 352, 206, 220, 126, PDF_COLOR_HIGHLIGHT);
  appendPdfText(commands, 368, 308, 'Recapitulatif', 'F2', 12, PDF_COLOR_TEXT);
  appendPdfText(commands, 368, 280, 'Sous-total', 'F1', 10, PDF_COLOR_MUTED);
  appendPdfText(commands, 492, 280, formatPdfAmount(invoice.subtotalAmount, invoice.currency), 'F2', 11, PDF_COLOR_TEXT);
  appendPdfText(commands, 368, 258, 'Taxes', 'F1', 10, PDF_COLOR_MUTED);
  appendPdfText(commands, 492, 258, formatPdfAmount(invoice.taxAmount, invoice.currency), 'F2', 11, PDF_COLOR_TEXT);
  appendPdfLine(commands, 368, 244, 556, 244, PDF_COLOR_BORDER, 0.75);
  appendPdfText(commands, 368, 222, 'Total', 'F2', 12, PDF_COLOR_TEXT);
  appendPdfText(commands, 482, 222, formatPdfAmount(invoice.totalAmount, invoice.currency), 'F2', 15, PDF_COLOR_RED);

  appendPdfText(commands, 40, 164, 'Merci pour votre confiance.', 'F2', 14, PDF_COLOR_TEXT);
  appendPdfText(commands, 40, 146, 'Garageplus - suivi simple, documents clairs, experience client moderne.', 'F1', 10, PDF_COLOR_MUTED);

  return buildPdfStreamDocument(commands.join('\n'));
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
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${buildInvoiceFileName(invoice)}.pdf"`
  );
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
