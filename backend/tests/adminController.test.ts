import test from 'node:test';
import assert from 'node:assert/strict';
import { __adminControllerInternals } from '../src/modules/admin/admin.controller';

test('normalizeSlotTimes trims, sorts and deduplicates admin slot inputs', () => {
  assert.deepEqual(
    __adminControllerInternals.normalizeSlotTimes(['14:00', '09:00', '14:00', ' 11:30 ']),
    ['09:00', '11:30', '14:00']
  );
});

test('slugifyService removes accents and produces a URL-safe slug', () => {
  assert.equal(__adminControllerInternals.slugifyService('Entretien climatisation + été'), 'entretien-climatisation-ete');
});

test('normalizeServiceDraft accepts mixed admin form input', () => {
  assert.deepEqual(
    __adminControllerInternals.normalizeServiceDraft({
      label: 'Entretien climatisation',
      description: 'Verification complete',
      durationMinutes: '50',
      price: '119.99',
      slotTimes: '14:45, 09:15, 14:45'
    }),
    {
      slug: 'entretien-climatisation',
      label: 'Entretien climatisation',
      description: 'Verification complete',
      durationMinutes: 50,
      price: 119.99,
      slotTimes: ['09:15', '14:45']
    }
  );
});

test('normalizePositiveAmount rejects invalid service price input', () => {
  assert.throws(
    () => __adminControllerInternals.normalizePositiveAmount('0'),
    /prix doit etre un nombre positif/i
  );
});
