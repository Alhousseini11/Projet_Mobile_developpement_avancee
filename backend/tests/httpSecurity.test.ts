import test from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/shared/errors';
import { buildPublicErrorMessage, resolveHttpErrorStatus } from '../src/core/http/httpErrors';
import { isCorsOriginAllowed } from '../src/core/http/security';

test('buildPublicErrorMessage hides generic errors in production and preserves application errors', () => {
  assert.equal(buildPublicErrorMessage(new Error('boom'), 'production'), 'Internal error');
  assert.equal(buildPublicErrorMessage(new Error('boom'), 'test'), 'boom');
  assert.equal(buildPublicErrorMessage(new AppError('Acces refuse.', 403), 'production'), 'Acces refuse.');
});

test('resolveHttpErrorStatus honors explicit HTTP status fields before falling back to 500', () => {
  assert.equal(resolveHttpErrorStatus(new AppError('Forbidden', 403)), 403);
  assert.equal(resolveHttpErrorStatus({ status: 413 }), 413);
  assert.equal(resolveHttpErrorStatus({ statusCode: 429 }), 429);
  assert.equal(resolveHttpErrorStatus(new Error('boom')), 500);
});

test('isCorsOriginAllowed stays open in non production without an allowlist and explicit in production', () => {
  assert.equal(
    isCorsOriginAllowed('http://localhost:8080', {
      allowedOrigins: [],
      nodeEnv: 'test'
    }),
    true
  );

  assert.equal(
    isCorsOriginAllowed('https://admin.example.com', {
      allowedOrigins: ['https://admin.example.com'],
      nodeEnv: 'production'
    }),
    true
  );

  assert.equal(
    isCorsOriginAllowed('https://evil.example.com', {
      allowedOrigins: ['https://admin.example.com'],
      nodeEnv: 'production'
    }),
    false
  );

  assert.equal(
    isCorsOriginAllowed(undefined, {
      allowedOrigins: [],
      nodeEnv: 'production'
    }),
    true
  );
});
