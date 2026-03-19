import test from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/shared/errors';

test('AppError keeps the provided HTTP status', () => {
  const error = new AppError('Conflit detecte', 409);

  assert.equal(error.message, 'Conflit detecte');
  assert.equal(error.status, 409);
  assert.equal(error instanceof Error, true);
});

test('AppError defaults to HTTP 400', () => {
  const error = new AppError('Requete invalide');

  assert.equal(error.status, 400);
});
