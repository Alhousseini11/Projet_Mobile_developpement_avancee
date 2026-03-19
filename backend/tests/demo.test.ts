import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_ACCOUNT, isDemoUserEmail, normalizeEmail } from '../src/config/demo';

test('normalizeEmail trims and lowercases email addresses', () => {
  assert.equal(normalizeEmail('  Alex.MARTIN@example.com  '), 'alex.martin@example.com');
  assert.equal(normalizeEmail(undefined), '');
});

test('isDemoUserEmail recognizes the configured demo account email', () => {
  assert.equal(isDemoUserEmail(DEMO_ACCOUNT.email), true);
  assert.equal(isDemoUserEmail('  ALEX.MARTIN@EXAMPLE.COM '), true);
  assert.equal(isDemoUserEmail('client@example.com'), false);
});
