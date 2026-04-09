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

test('normalizeUserActiveFlag accepts booleans and rejects other values', () => {
  assert.equal(__adminControllerInternals.normalizeUserActiveFlag(true), true);
  assert.equal(__adminControllerInternals.normalizeUserActiveFlag(false), false);
  assert.throws(
    () => __adminControllerInternals.normalizeUserActiveFlag('false'),
    /statut actif doit etre un booleen/i
  );
});

test('normalizeTutorialCategory and difficulty map known admin values', () => {
  assert.equal(__adminControllerInternals.normalizeTutorialCategory('freins'), 'freins');
  assert.equal(__adminControllerInternals.normalizeTutorialCategory('inconnu'), 'entretien');
  assert.equal(__adminControllerInternals.normalizeTutorialDifficulty('difficile'), 'difficile');
  assert.equal(__adminControllerInternals.normalizeTutorialDifficulty('autre'), 'facile');
});

test('normalizeStringList trims values and enforces required lists', () => {
  assert.deepEqual(
    __adminControllerInternals.normalizeStringList('Lever la voiture\nVerifier les freins\nLever la voiture', 'Instructions', {
      required: true
    }),
    ['Lever la voiture', 'Verifier les freins']
  );

  assert.throws(
    () => __adminControllerInternals.normalizeStringList('', 'Instructions', { required: true }),
    /Instructions est obligatoire/i
  );
});

test('normalizeTutorialCategory and difficulty cover all known admin values', () => {
  assert.equal(__adminControllerInternals.normalizeTutorialCategory('entretien'), 'entretien');
  assert.equal(__adminControllerInternals.normalizeTutorialCategory('freins'), 'freins');
  assert.equal(__adminControllerInternals.normalizeTutorialCategory('suspension'), 'suspension');
  assert.equal(__adminControllerInternals.normalizeTutorialCategory('batterie'), 'batterie');
  assert.equal(__adminControllerInternals.normalizeTutorialCategory('diagnostic'), 'diagnostic');
  assert.equal(__adminControllerInternals.normalizeTutorialCategory('eclairage'), 'eclairage');
  assert.equal(__adminControllerInternals.normalizeTutorialCategory('fluide'), 'fluide');
  assert.equal(__adminControllerInternals.normalizeTutorialCategory('mecanique'), 'mecanique');

  assert.equal(__adminControllerInternals.normalizeTutorialDifficulty('facile'), 'facile');
  assert.equal(__adminControllerInternals.normalizeTutorialDifficulty('moyen'), 'moyen');
  assert.equal(__adminControllerInternals.normalizeTutorialDifficulty('difficile'), 'difficile');
});

test('admin controller internals normalize optional fields and reject invalid numeric inputs', () => {
  assert.equal(__adminControllerInternals.normalizeOptionalTrimmedString('  note atelier  '), 'note atelier');
  assert.equal(__adminControllerInternals.normalizeOptionalTrimmedString('   '), null);

  assert.equal(__adminControllerInternals.normalizePositiveInteger('42', 'La duree'), 42);
  assert.throws(
    () => __adminControllerInternals.normalizePositiveInteger('0', 'La duree'),
    /duree doit etre un entier positif/i
  );
});

test('normalizeSlotTimes rejects invalid time formats and normalizeServiceDraft keeps explicit slug', () => {
  assert.throws(
    () => __adminControllerInternals.normalizeSlotTimes(['9h00']),
    /Horaire invalide/i
  );

  assert.deepEqual(
    __adminControllerInternals.normalizeServiceDraft({
      label: 'Revision complete',
      slug: 'revision-sport',
      description: 'Pack premium',
      durationMinutes: 90,
      price: 189.5,
      slotTimes: ['16:00', '08:30']
    }),
    {
      slug: 'revision-sport',
      label: 'Revision complete',
      description: 'Pack premium',
      durationMinutes: 90,
      price: 189.5,
      slotTimes: ['08:30', '16:00']
    }
  );
});
