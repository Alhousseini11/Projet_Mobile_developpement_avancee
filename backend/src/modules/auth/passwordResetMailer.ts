import sgMail from '@sendgrid/mail';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { AppError } from '../../shared/errors';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function trimOrEmpty(value?: string | null) {
  return value?.trim() || '';
}

export function isPasswordResetEmailEnabled() {
  return Boolean(
    env.SENDGRID_ENABLED &&
      trimOrEmpty(env.SENDGRID_API_KEY) &&
      trimOrEmpty(env.SENDGRID_FROM_EMAIL)
  );
}

export function buildPasswordResetUrl(baseUrl: string, token: string, email?: string | null) {
  const url = new URL(baseUrl);
  url.searchParams.set('token', token);

  const normalizedEmail = trimOrEmpty(email).toLowerCase();
  if (normalizedEmail) {
    url.searchParams.set('email', normalizedEmail);
  }

  return url.toString();
}

function buildPasswordResetEmailContent(payload: {
  fullName: string;
  resetCode: string;
  expiresAt: string;
}) {
  const firstName = payload.fullName.trim().split(/\s+/)[0] || 'client';
  const safeName = escapeHtml(firstName);
  const safeCode = escapeHtml(payload.resetCode);
  const safeExpiresAt = escapeHtml(new Date(payload.expiresAt).toLocaleString());

  return {
    subject: 'Reinitialisation de votre mot de passe Garage Mechanic',
    text: [
      `Bonjour ${firstName},`,
      '',
      'Nous avons recu une demande de reinitialisation de mot de passe pour votre compte Garage Mechanic.',
      '',
      `Code de reinitialisation: ${payload.resetCode}`,
      `Expiration: ${new Date(payload.expiresAt).toLocaleString()}`,
      '',
      "Ouvrez l'application Garage Mechanic, puis saisissez ce code pour definir votre nouveau mot de passe.",
      '',
      "Si vous n'etes pas a l'origine de cette demande, ignorez simplement cet email."
    ].join('\n'),
    html: [
      '<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111827;">',
      '<h2 style="margin:0 0 16px 0;color:#111827;">Reinitialisation du mot de passe</h2>',
      `<p>Bonjour <strong>${safeName}</strong>,</p>`,
      '<p>Nous avons recu une demande de reinitialisation de mot de passe pour votre compte Garage Mechanic.</p>',
      `<p><strong>Code de reinitialisation :</strong><br /><code style="display:inline-block;padding:14px 18px;background:#111827;border-radius:8px;color:#ffffff;font-size:24px;letter-spacing:0.3em;font-weight:700;">${safeCode}</code></p>`,
      "<p>Entrez ce code directement dans l'application pour definir votre nouveau mot de passe.</p>",
      `<p><strong>Expiration :</strong> ${safeExpiresAt}</p>`,
      "<p>Si vous n'etes pas a l'origine de cette demande, ignorez simplement cet email.</p>",
      '</div>'
    ].join('')
  };
}

export const __passwordResetMailerInternals = {
  buildPasswordResetEmailContent,
  buildPasswordResetUrl
};

export async function sendPasswordResetEmail(payload: {
  toEmail: string;
  fullName: string;
  resetCode: string;
  expiresAt: string;
}) {
  if (!isPasswordResetEmailEnabled()) {
    return false;
  }

  const content = buildPasswordResetEmailContent({
    fullName: payload.fullName,
    resetCode: payload.resetCode,
    expiresAt: payload.expiresAt
  });

  sgMail.setApiKey(env.SENDGRID_API_KEY);

  try {
    await sgMail.send({
      to: payload.toEmail,
      from: {
        email: env.SENDGRID_FROM_EMAIL,
        name: env.SENDGRID_FROM_NAME
      },
      replyTo: env.SENDGRID_FROM_EMAIL,
      subject: content.subject,
      text: content.text,
      html: content.html
    });

    logger.info(
      {
        email: payload.toEmail
      },
      'Password reset email sent through SendGrid'
    );

    return true;
  } catch (error) {
    logger.error(
      {
        err: error,
        email: payload.toEmail
      },
      'Failed to send password reset email through SendGrid'
    );
    throw new AppError("Impossible d'envoyer l'email de reinitialisation pour le moment.", 503);
  }
}
