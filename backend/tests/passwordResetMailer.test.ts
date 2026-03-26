import test from 'node:test';
import assert from 'node:assert/strict';
import sgMail from '@sendgrid/mail';
import { env } from '../src/config/env';
import {
  __passwordResetMailerInternals,
  buildPasswordResetUrl,
  isPasswordResetEmailEnabled,
  sendPasswordResetEmail
} from '../src/modules/auth/passwordResetMailer';

test('buildPasswordResetUrl appends token and normalized email to a plain URL', () => {
  const url = buildPasswordResetUrl(
    'http://localhost:8080/reset-password',
    'abc123',
    '  Client@Example.com '
  );

  assert.equal(
    url,
    'http://localhost:8080/reset-password?token=abc123&email=client%40example.com'
  );
});

test('buildPasswordResetUrl preserves existing query parameters', () => {
  const url = buildPasswordResetUrl(
    'http://localhost:8080/reset-password?source=mobile',
    'abc123'
  );

  assert.equal(url, 'http://localhost:8080/reset-password?source=mobile&token=abc123');
});

test('password reset mail content includes only the reset code and expiration data', () => {
  const content = __passwordResetMailerInternals.buildPasswordResetEmailContent({
    fullName: 'Alex Martin',
    resetCode: '482913',
    expiresAt: '2026-03-26T15:30:00.000Z'
  });

  assert.match(content.subject, /Reinitialisation/);
  assert.match(content.text, /482913/);
  assert.doesNotMatch(content.text, /Jeton de reinitialisation/i);
  assert.doesNotMatch(content.text, /Lien de reinitialisation/i);
  assert.match(content.html, /Alex/);
  assert.match(content.html, /482913/);
  assert.doesNotMatch(content.html, /Jeton de reinitialisation/i);
  assert.doesNotMatch(content.html, /Reinitialiser mon mot de passe/i);
});

test('isPasswordResetEmailEnabled returns false when SendGrid config is incomplete', () => {
  const previous = {
    SENDGRID_ENABLED: env.SENDGRID_ENABLED,
    SENDGRID_API_KEY: env.SENDGRID_API_KEY,
    SENDGRID_FROM_EMAIL: env.SENDGRID_FROM_EMAIL
  };

  env.SENDGRID_ENABLED = true;
  env.SENDGRID_API_KEY = '';
  env.SENDGRID_FROM_EMAIL = '';

  try {
    assert.equal(isPasswordResetEmailEnabled(), false);
  } finally {
    env.SENDGRID_ENABLED = previous.SENDGRID_ENABLED;
    env.SENDGRID_API_KEY = previous.SENDGRID_API_KEY;
    env.SENDGRID_FROM_EMAIL = previous.SENDGRID_FROM_EMAIL;
  }
});

test('sendPasswordResetEmail returns false when SendGrid delivery is disabled', async () => {
  const previous = {
    SENDGRID_ENABLED: env.SENDGRID_ENABLED,
    SENDGRID_API_KEY: env.SENDGRID_API_KEY,
    SENDGRID_FROM_EMAIL: env.SENDGRID_FROM_EMAIL
  };

  env.SENDGRID_ENABLED = false;
  env.SENDGRID_API_KEY = '';
  env.SENDGRID_FROM_EMAIL = '';

  try {
    const result = await sendPasswordResetEmail({
      toEmail: 'client@example.com',
      fullName: 'Client Test',
      resetCode: '482913',
      expiresAt: '2026-03-26T15:30:00.000Z'
    });

    assert.equal(result, false);
  } finally {
    env.SENDGRID_ENABLED = previous.SENDGRID_ENABLED;
    env.SENDGRID_API_KEY = previous.SENDGRID_API_KEY;
    env.SENDGRID_FROM_EMAIL = previous.SENDGRID_FROM_EMAIL;
  }
});

test('sendPasswordResetEmail sends a formatted email through SendGrid when configured', async () => {
  const previousEnv = {
    SENDGRID_ENABLED: env.SENDGRID_ENABLED,
    SENDGRID_API_KEY: env.SENDGRID_API_KEY,
    SENDGRID_FROM_EMAIL: env.SENDGRID_FROM_EMAIL,
    SENDGRID_FROM_NAME: env.SENDGRID_FROM_NAME
  };
  const previousSetApiKey = sgMail.setApiKey;
  const previousSend = sgMail.send;

  let configuredApiKey = '';
  let sentPayload: any = null;

  env.SENDGRID_ENABLED = true;
  env.SENDGRID_API_KEY = 'SG.test-key';
  env.SENDGRID_FROM_EMAIL = 'garage@example.com';
  env.SENDGRID_FROM_NAME = 'Garage Mechanic';

  sgMail.setApiKey = ((value: string) => {
    configuredApiKey = value;
  }) as typeof sgMail.setApiKey;

  sgMail.send = (async (payload: unknown) => {
    sentPayload = payload;
    return [{ statusCode: 202 }, {}] as any;
  }) as typeof sgMail.send;

  try {
    const result = await sendPasswordResetEmail({
      toEmail: 'client@example.com',
      fullName: 'Client Test',
      resetCode: '482913',
      expiresAt: '2026-03-26T15:30:00.000Z'
    });

    assert.equal(result, true);
    assert.equal(configuredApiKey, 'SG.test-key');
    assert.equal(sentPayload.to, 'client@example.com');
    assert.equal(sentPayload.from.email, 'garage@example.com');
    assert.equal(sentPayload.from.name, 'Garage Mechanic');
    assert.equal(sentPayload.replyTo, 'garage@example.com');
    assert.match(sentPayload.subject, /Reinitialisation/);
    assert.match(sentPayload.text, /482913/);
    assert.doesNotMatch(sentPayload.text, /Jeton de reinitialisation/i);
    assert.doesNotMatch(sentPayload.text, /Lien de reinitialisation/i);
    assert.doesNotMatch(sentPayload.text, /https:\/\/garage\.example\.com\/reset-password/i);
    assert.match(sentPayload.html, /482913/);
    assert.doesNotMatch(sentPayload.html, /Jeton de reinitialisation/i);
    assert.doesNotMatch(sentPayload.html, /Reinitialiser mon mot de passe/i);
  } finally {
    env.SENDGRID_ENABLED = previousEnv.SENDGRID_ENABLED;
    env.SENDGRID_API_KEY = previousEnv.SENDGRID_API_KEY;
    env.SENDGRID_FROM_EMAIL = previousEnv.SENDGRID_FROM_EMAIL;
    env.SENDGRID_FROM_NAME = previousEnv.SENDGRID_FROM_NAME;
    sgMail.setApiKey = previousSetApiKey;
    sgMail.send = previousSend;
  }
});

test('sendPasswordResetEmail surfaces SendGrid delivery failures as AppError', async () => {
  const previousEnv = {
    SENDGRID_ENABLED: env.SENDGRID_ENABLED,
    SENDGRID_API_KEY: env.SENDGRID_API_KEY,
    SENDGRID_FROM_EMAIL: env.SENDGRID_FROM_EMAIL,
    SENDGRID_FROM_NAME: env.SENDGRID_FROM_NAME
  };
  const previousSetApiKey = sgMail.setApiKey;
  const previousSend = sgMail.send;

  env.SENDGRID_ENABLED = true;
  env.SENDGRID_API_KEY = 'SG.test-key';
  env.SENDGRID_FROM_EMAIL = 'garage@example.com';
  env.SENDGRID_FROM_NAME = 'Garage Mechanic';

  sgMail.setApiKey = ((_: string) => undefined) as typeof sgMail.setApiKey;
  sgMail.send = (async () => {
    throw new Error('sendgrid down');
  }) as typeof sgMail.send;

  try {
    await assert.rejects(
      () =>
        sendPasswordResetEmail({
          toEmail: 'client@example.com',
          fullName: 'Client Test',
          resetCode: '482913',
          expiresAt: '2026-03-26T15:30:00.000Z'
        }),
      error => {
        assert.equal((error as Error).message, "Impossible d'envoyer l'email de reinitialisation pour le moment.");
        return true;
      }
    );
  } finally {
    env.SENDGRID_ENABLED = previousEnv.SENDGRID_ENABLED;
    env.SENDGRID_API_KEY = previousEnv.SENDGRID_API_KEY;
    env.SENDGRID_FROM_EMAIL = previousEnv.SENDGRID_FROM_EMAIL;
    env.SENDGRID_FROM_NAME = previousEnv.SENDGRID_FROM_NAME;
    sgMail.setApiKey = previousSetApiKey;
    sgMail.send = previousSend;
  }
});
