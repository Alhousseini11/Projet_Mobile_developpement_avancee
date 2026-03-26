import test from 'node:test';
import assert from 'node:assert/strict';
import { __passwordResetMailerInternals, buildPasswordResetUrl } from '../src/modules/auth/passwordResetMailer';

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

test('password reset mail content includes reset link, token and expiration data', () => {
  const content = __passwordResetMailerInternals.buildPasswordResetEmailContent({
    fullName: 'Alex Martin',
    resetUrl: 'http://localhost:8080/reset-password?token=abc123',
    resetToken: 'abc123',
    expiresAt: '2026-03-26T15:30:00.000Z'
  });

  assert.match(content.subject, /Reinitialisation/);
  assert.match(content.text, /abc123/);
  assert.match(content.text, /http:\/\/localhost:8080\/reset-password\?token=abc123/);
  assert.match(content.html, /Alex/);
  assert.match(content.html, /abc123/);
});
