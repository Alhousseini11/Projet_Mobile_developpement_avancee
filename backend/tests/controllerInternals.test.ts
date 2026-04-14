import test from 'node:test';
import assert from 'node:assert/strict';
import { Prisma, ReservationStatus, Role } from '@prisma/client';
import { env } from '../src/config/env';
import { __homeControllerInternals } from '../src/modules/home/home.controller';
import { __vehicleControllerInternals } from '../src/modules/vehicles/vehicles.controller';
import { __tutorialControllerInternals } from '../src/modules/tutorials/tutorials.controller';
import { __reservationsControllerInternals } from '../src/modules/reservations/reservations.controller';
import { __profileControllerInternals } from '../src/modules/profile/profile.controller';

test('home controller internals normalize display and reminder content', () => {
  assert.equal(__homeControllerInternals.getFirstName(undefined), 'Alex');
  assert.equal(__homeControllerInternals.getFirstName('  Jean Dupont  '), 'Jean');
  assert.equal(
    __homeControllerInternals.capitalizeWords('oil-change_fast-track'),
    'Oil Change Fast Track'
  );

  const formattedDate = __homeControllerInternals.formatAppointmentDate(
    new Date(2026, 2, 24, 13, 5, 0)
  );
  assert.match(formattedDate, /24 mars/i);
  assert.match(formattedDate, /13h05/);

  assert.deepEqual(__homeControllerInternals.buildDefaultFeed('Alex'), {
    displayName: 'Alex',
    nextAppointmentLabel: 'Aucun rendez-vous planifie pour le moment.',
    promoMessage: 'Promos: 20% sur les freins cette semaine.',
    reminderMessage: 'Rappel: Consultez vos vehicules pour planifier votre prochain entretien.'
  });

  assert.match(
    __homeControllerInternals.buildReminderMessage({
      reminderTitle: 'Verifier la pression',
      reminderDueAt: new Date(2026, 2, 25, 9, 30, 0)
    }),
    /Verifier la pression/
  );
  assert.match(
    __homeControllerInternals.buildReminderMessage({
      vehicleName: 'Honda',
      vehicleModel: 'Civic',
      vehicleMileage: 23500
    }),
    /Honda Civic/
  );
  assert.match(
    __homeControllerInternals.buildReminderMessage({}),
    /Consultez vos vehicules/i
  );
});

test('vehicle controller internals normalize write payloads and mappings', () => {
  assert.equal(__vehicleControllerInternals.normalizeText(42), null);
  assert.equal(__vehicleControllerInternals.normalizeText('  Test  '), 'Test');
  assert.equal(__vehicleControllerInternals.normalizeRequiredText('   '), 'Vehicule');
  assert.equal(__vehicleControllerInternals.normalizeRequiredText('Mazda', 'Fallback'), 'Mazda');

  assert.equal(__vehicleControllerInternals.normalizeNumber('12034', 0), 12034);
  assert.equal(__vehicleControllerInternals.normalizeNumber('oops', 12), 12);
  assert.equal(__vehicleControllerInternals.normalizeNumber(undefined, 9), 9);

  const parsedDate = __vehicleControllerInternals.normalizeDate('2026-03-24T10:00:00.000Z');
  assert.ok(parsedDate instanceof Date);
  assert.equal(parsedDate.toISOString(), '2026-03-24T10:00:00.000Z');
  assert.ok(__vehicleControllerInternals.normalizeDate('invalid-date') instanceof Date);

  assert.equal(__vehicleControllerInternals.normalizeVehicleType('SUV'), 'suv');
  assert.equal(__vehicleControllerInternals.normalizeVehicleType('truck'), 'truck');
  assert.equal(__vehicleControllerInternals.normalizeVehicleType('minivan'), 'minivan');
  assert.equal(__vehicleControllerInternals.normalizeVehicleType('coupe'), 'coupe');
  assert.equal(__vehicleControllerInternals.normalizeVehicleType('other'), 'other');
  assert.equal(__vehicleControllerInternals.normalizeVehicleType('unknown'), 'sedan');

  assert.deepEqual(
    __vehicleControllerInternals.buildVehicleWritePayload({
      name: '   ',
      model: '  Yaris  ',
      year: '2026',
      mileage: '123000',
      type: 'SUV',
      licensePlate: ' AB-123 ',
      fuelType: ' Essence ',
      vin: '',
      color: ' Rouge '
    }),
    {
      name: 'Vehicule',
      model: 'Yaris',
      year: 2026,
      mileage: 123000,
      type: 'suv',
      licensePlate: 'AB-123',
      fuelType: 'Essence',
      vin: null,
      color: 'Rouge'
    }
  );

  const now = new Date('2026-03-24T10:30:00.000Z');
  const currentVehicle = __vehicleControllerInternals.mapCurrentVehicle({
    id: 'veh-1',
    userId: 'user-1',
    name: 'Honda',
    model: 'Civic',
    year: 2021,
    mileage: 32000,
    type: 'SUV',
    licensePlate: 'QC-001',
    fuelType: 'Essence',
    color: 'Bleu',
    createdAt: now,
    updatedAt: now
  });
  assert.equal(currentVehicle.type, 'suv');
  assert.equal(currentVehicle.licensePlate, 'QC-001');

  const legacyVehicle = __vehicleControllerInternals.mapLegacyVehicle({
    id: 'legacy-1',
    userId: 'user-2',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2018,
    mileage: null
  });
  assert.equal(legacyVehicle.name, 'Toyota');
  assert.equal(legacyVehicle.model, 'Corolla');
  assert.equal(legacyVehicle.mileage, 0);
  assert.equal(legacyVehicle.type, 'sedan');
});

test('tutorial controller internals normalize categories, difficulty and catalog records', () => {
  const normalizedDate = new Date('2026-03-24T10:00:00.000Z');
  assert.equal(__tutorialControllerInternals.normalizeDate(normalizedDate), normalizedDate);
  assert.ok(__tutorialControllerInternals.normalizeDate('bad-date') instanceof Date);

  assert.deepEqual(__tutorialControllerInternals.ensureStringArray('not-an-array'), []);
  assert.equal(__tutorialControllerInternals.normalizeCategory('battery'), 'batterie');
  assert.equal(__tutorialControllerInternals.normalizeCategory('freins'), 'freins');
  assert.equal(__tutorialControllerInternals.normalizeCategory('suspension'), 'suspension');
  assert.equal(__tutorialControllerInternals.normalizeCategory('diagnostic'), 'diagnostic');
  assert.equal(__tutorialControllerInternals.normalizeCategory('lighting'), 'eclairage');
  assert.equal(__tutorialControllerInternals.normalizeCategory('fluid'), 'fluide');
  assert.equal(__tutorialControllerInternals.normalizeCategory('maintenance'), 'entretien');
  assert.equal(__tutorialControllerInternals.normalizeCategory('mechanic'), 'mecanique');
  assert.equal(__tutorialControllerInternals.normalizeCategory('mechanique'), 'mecanique');
  assert.equal(__tutorialControllerInternals.normalizeCategory('unknown'), 'entretien');

  assert.equal(__tutorialControllerInternals.normalizeDifficulty('easy'), 'facile');
  assert.equal(__tutorialControllerInternals.normalizeDifficulty('facile'), 'facile');
  assert.equal(__tutorialControllerInternals.normalizeDifficulty('hard'), 'difficile');
  assert.equal(__tutorialControllerInternals.normalizeDifficulty('difficile'), 'difficile');
  assert.equal(__tutorialControllerInternals.normalizeDifficulty('medium'), 'moyen');
  assert.equal(__tutorialControllerInternals.normalizeDifficulty('moyen'), 'moyen');
  assert.equal(__tutorialControllerInternals.normalizeDifficulty(undefined), 'moyen');

  assert.equal(__tutorialControllerInternals.normalizeDuration(8.2), 8);
  assert.equal(__tutorialControllerInternals.normalizeDuration(-4), 0);
  assert.equal(__tutorialControllerInternals.normalizeDuration(null), 0);
  assert.equal(__tutorialControllerInternals.normalizeDurationFromSeconds(90), 2);
  assert.equal(__tutorialControllerInternals.normalizeDurationFromSeconds(null), 0);
  assert.equal(__tutorialControllerInternals.normalizeTutorialRating(5), 5);
  assert.deepEqual(
    __tutorialControllerInternals.normalizeTutorialWritePayload({
      title: '  Verifier la batterie  ',
      description: '  Tutoriel utile  ',
      category: 'battery',
      difficulty: 'easy',
      duration: '12',
      thumbnail: ' https://example.com/thumb.png ',
      videoUrl: ' https://example.com/video.mp4 ',
      instructions: [' Couper le moteur ', 42, 'Verifier la tension'],
      tools: [' Multimetre ', null]
    }),
    {
      title: 'Verifier la batterie',
      description: 'Tutoriel utile',
      category: 'batterie',
      difficulty: 'facile',
      duration: 12,
      thumbnail: 'https://example.com/thumb.png',
      videoUrl: 'https://example.com/video.mp4',
      instructions: ['Couper le moteur', 'Verifier la tension'],
      tools: ['Multimetre']
    }
  );
  const tutorialAliasCases = [
    { category: 'entretien', difficulty: 'facile', expectedCategory: 'entretien', expectedDifficulty: 'facile' },
    { category: 'maintenance', difficulty: 'easy', expectedCategory: 'entretien', expectedDifficulty: 'facile' },
    { category: 'freins', difficulty: 'moyen', expectedCategory: 'freins', expectedDifficulty: 'moyen' },
    { category: 'suspension', difficulty: 'medium', expectedCategory: 'suspension', expectedDifficulty: 'moyen' },
    { category: 'diagnostic', difficulty: 'difficile', expectedCategory: 'diagnostic', expectedDifficulty: 'difficile' },
    { category: 'eclairage', difficulty: 'hard', expectedCategory: 'eclairage', expectedDifficulty: 'difficile' },
    { category: 'lighting', difficulty: 'facile', expectedCategory: 'eclairage', expectedDifficulty: 'facile' },
    { category: 'fluide', difficulty: 'moyen', expectedCategory: 'fluide', expectedDifficulty: 'moyen' },
    { category: 'fluid', difficulty: 'difficile', expectedCategory: 'fluide', expectedDifficulty: 'difficile' },
    { category: 'mecanique', difficulty: 'easy', expectedCategory: 'mecanique', expectedDifficulty: 'facile' },
    { category: 'mechanique', difficulty: 'medium', expectedCategory: 'mecanique', expectedDifficulty: 'moyen' },
    { category: 'mechanic', difficulty: 'hard', expectedCategory: 'mecanique', expectedDifficulty: 'difficile' }
  ];
  for (const tutorialAliasCase of tutorialAliasCases) {
    const normalized = __tutorialControllerInternals.normalizeTutorialWritePayload({
      title: 'Tutoriel test',
      description: 'Description test',
      category: tutorialAliasCase.category,
      difficulty: tutorialAliasCase.difficulty,
      duration: 10,
      thumbnail: 'https://example.com/thumb.png',
      videoUrl: 'https://example.com/video.mp4',
      instructions: ['Etape 1'],
      tools: undefined
    });
    assert.equal(normalized.category, tutorialAliasCase.expectedCategory);
    assert.equal(normalized.difficulty, tutorialAliasCase.expectedDifficulty);
    assert.deepEqual(normalized.tools, []);
  }
  assert.throws(
    () => __tutorialControllerInternals.normalizeTutorialRating(0),
    /entier entre 1 et 5/i
  );
  assert.equal(__tutorialControllerInternals.normalizeTutorialRating('4'), 4);
  assert.throws(
    () => __tutorialControllerInternals.normalizeTutorialRating(4.5),
    /entier entre 1 et 5/i
  );
  assert.throws(
    () => __tutorialControllerInternals.normalizeTutorialWritePayload(null),
    /titre/i
  );
  assert.throws(
    () => __tutorialControllerInternals.normalizeTutorialWritePayload({
      title: 'Tutoriel incomplet',
      description: '',
      category: 'unknown',
      difficulty: 'facile',
      duration: 0,
      thumbnail: '',
      videoUrl: '',
      instructions: [],
      tools: []
    }),
    /description|categorie|duree|miniature|video|instruction/i
  );
  assert.throws(
    () => __tutorialControllerInternals.normalizeTutorialWritePayload({
      title: 'Tutoriel incomplet',
      description: 'Description',
      category: 'batterie',
      difficulty: 'expert',
      duration: 8,
      thumbnail: 'https://example.com/thumb.png',
      videoUrl: 'https://example.com/video.mp4',
      instructions: ['Etape 1'],
      tools: []
    }),
    /difficulte/i
  );
  assert.throws(
    () => __tutorialControllerInternals.normalizeTutorialWritePayload({
      title: 'Tutoriel incomplet',
      description: 'Description',
      category: 'batterie',
      difficulty: 'facile',
      duration: 8,
      thumbnail: 'https://example.com/thumb.png',
      videoUrl: 'https://example.com/video.mp4',
      instructions: 'Etape 1',
      tools: []
    }),
    /instruction/i
  );
  assert.equal(__tutorialControllerInternals.shouldCountQualifiedTutorialView(null), true);
  assert.equal(
    __tutorialControllerInternals.shouldCountQualifiedTutorialView(new Date('invalid')),
    true
  );
  assert.equal(
    __tutorialControllerInternals.shouldCountQualifiedTutorialView(
      new Date('2026-03-24T10:00:00.000Z'),
      new Date('2026-03-24T14:00:00.000Z')
    ),
    false
  );
  assert.equal(
    __tutorialControllerInternals.shouldCountQualifiedTutorialView(
      new Date('2026-03-24T10:00:00.000Z'),
      new Date('2026-03-25T11:00:00.000Z')
    ),
    true
  );

  assert.deepEqual(
    __tutorialControllerInternals.ensureStringArray(['A', 42, 'B', null]),
    ['A', 'B']
  );

  const mappedCurrent = __tutorialControllerInternals.mapCurrentTutorial({
    id: 'tutorial-1',
    title: 'Verifier la batterie',
    description: 'Guide rapide',
    category: 'battery',
    difficulty: 'easy',
    duration: 12.6,
    views: -14,
    rating: Number.NaN,
    thumbnail: '',
    videoUrl: 'https://example.com/video',
    instructions: ['Couper le moteur', 42],
    tools: ['Multimetre', null],
    createdAt: new Date('2026-03-20T10:00:00.000Z'),
    updatedAt: new Date('2026-03-20T11:00:00.000Z')
  });
  assert.equal(mappedCurrent.category, 'batterie');
  assert.equal(mappedCurrent.difficulty, 'facile');
  assert.equal(mappedCurrent.duration, 13);
  assert.equal(mappedCurrent.views, 0);
  assert.equal(mappedCurrent.rating, 0);
  assert.equal(mappedCurrent.thumbnail, 'res://logo');
  assert.deepEqual(mappedCurrent.instructions, ['Couper le moteur']);
  assert.deepEqual(mappedCurrent.tools, ['Multimetre']);

  const clonedTutorial = __tutorialControllerInternals.cloneTutorial(mappedCurrent);
  assert.notEqual(clonedTutorial.instructions, mappedCurrent.instructions);
  assert.notEqual(clonedTutorial.tools, mappedCurrent.tools);
  assert.notEqual(clonedTutorial.createdAt, mappedCurrent.createdAt);

  const mappedLegacy = __tutorialControllerInternals.mapLegacyTutorial({
    id: 'legacy-tutorial',
    title: 'Tutoriel legacy',
    category: 'maintenance',
    difficulty: 'hard',
    videoUrl: null,
    thumbnail: null,
    durationSec: 420,
    createdAt: '2026-03-21T12:00:00.000Z'
  });
  assert.equal(mappedLegacy.category, 'entretien');
  assert.equal(mappedLegacy.difficulty, 'difficile');
  assert.equal(mappedLegacy.duration, 7);
  assert.equal(mappedLegacy.thumbnail, 'res://logo');
  assert.match(mappedLegacy.videoUrl, /example\.com\/videos\/tutorial/i);
  assert.match(mappedLegacy.description, /legacy/i);
});

test('reservation controller internals normalize reservation payloads', () => {
  assert.equal(
    __reservationsControllerInternals.toIsoDate(new Date('2026-03-24T10:15:00.000Z')),
    '2026-03-24'
  );
  assert.equal(
    __reservationsControllerInternals.toTimeLabel(new Date('2026-03-24T10:15:00.000Z')),
    '10:15'
  );
  assert.equal(__reservationsControllerInternals.toPrismaStatus('pending'), ReservationStatus.PENDING);
  assert.equal(__reservationsControllerInternals.toPrismaStatus('confirmed'), ReservationStatus.CONFIRMED);
  assert.equal(__reservationsControllerInternals.toPrismaStatus('completed'), ReservationStatus.COMPLETED);
  assert.equal(__reservationsControllerInternals.toPrismaStatus('cancelled'), ReservationStatus.CANCELLED);
  assert.equal(__reservationsControllerInternals.toPrismaStatus('unknown'), null);
  assert.equal(__reservationsControllerInternals.fromPrismaStatus(ReservationStatus.PAID), 'confirmed');
  assert.equal(__reservationsControllerInternals.fromPrismaStatus(ReservationStatus.COMPLETED), 'completed');
  assert.equal(__reservationsControllerInternals.fromPrismaStatus(ReservationStatus.CANCELLED), 'cancelled');
  assert.equal(__reservationsControllerInternals.fromPrismaStatus(ReservationStatus.PENDING), 'pending');

  assert.equal(
    __reservationsControllerInternals.buildScheduledAt('2026-04-10', '11:30').toISOString(),
    '2026-04-10T11:30:00.000Z'
  );
  assert.equal(
    __reservationsControllerInternals.formatReservationVehicleLabel({ name: 'Honda', model: 'Civic' }),
    'Honda Civic'
  );
  assert.equal(
    __reservationsControllerInternals.formatReservationVehicleLabel({ name: 'Honda', model: 'Honda' }),
    'Honda'
  );
  assert.equal(
    __reservationsControllerInternals.formatReservationVehicleLabel({ name: '', model: 'Civic' }),
    'Civic'
  );
  assert.equal(__reservationsControllerInternals.formatReservationVehicleLabel(null), undefined);

  const record = __reservationsControllerInternals.toReservationQueryRecord({
    id: 'reservation-1',
    userId: 'user-1',
    serviceType: 'oil-change',
    description: 'Notes',
    status: ReservationStatus.PAID,
    scheduledAt: new Date('2026-04-10T11:30:00.000Z'),
    createdAt: new Date('2026-04-01T09:00:00.000Z'),
    updatedAt: new Date('2026-04-01T09:15:00.000Z')
  });
  assert.equal(record.vehicleId, null);
  assert.equal(record.vehicle, null);

  const serialized = __reservationsControllerInternals.serializeReservation({
    ...record,
    vehicleId: 'veh-1',
    vehicle: { name: 'Honda', model: 'Civic' }
  });
  assert.equal(serialized.serviceLabel, 'Vidange');
  assert.equal(serialized.vehicleLabel, 'Honda Civic');
  assert.equal(serialized.status, 'confirmed');
  assert.equal(serialized.date, '2026-04-10');
  assert.equal(serialized.time, '11:30');
});

test('profile controller internals normalize profile fields and invoice helpers', () => {
  assert.equal(__profileControllerInternals.normalizeOptionalText(42), null);
  assert.equal(__profileControllerInternals.normalizeOptionalText('  Montreal  '), 'Montreal');
  assert.equal(__profileControllerInternals.normalizeOptionalText('   '), null);

  const parsedDate = __profileControllerInternals.normalizeOptionalDate('2026-03-24');
  assert.ok(parsedDate instanceof Date);
  assert.equal(parsedDate?.toISOString().slice(0, 10), '2026-03-24');
  assert.equal(__profileControllerInternals.normalizeOptionalDate('bad-date'), null);
  assert.equal(__profileControllerInternals.normalizeOptionalDate(undefined), null);

  assert.equal(__profileControllerInternals.normalizeOptionalInteger(15.8), 16);
  assert.equal(__profileControllerInternals.normalizeOptionalInteger('-3'), 0);
  assert.equal(__profileControllerInternals.normalizeOptionalInteger('abc'), null);

  const pendingMessage = __profileControllerInternals.buildPaymentMessage('pending', null);
  assert.match(
    pendingMessage,
    env.STRIPE_KEY.trim().length > 0
      ? /Session Stripe ouverte/i
      : /Ajoutez une cle Stripe/i
  );
  const readyMessage = __profileControllerInternals.buildPaymentMessage('ready', {
    brand: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2030
  });
  assert.match(
    readyMessage,
    env.STRIPE_KEY.trim().length > 0
      ? /Carte Stripe synchronisee/i
      : /Ajoutez une cle Stripe/i
  );
  const notConfiguredMessage = __profileControllerInternals.buildPaymentMessage('not_configured', null);
  assert.match(
    notConfiguredMessage,
    env.STRIPE_KEY.trim().length > 0
      ? /Aucun moyen de paiement Stripe/i
      : /Ajoutez une cle Stripe/i
  );

  assert.equal(__profileControllerInternals.normalizePaymentStatus('ready'), 'ready');
  assert.equal(__profileControllerInternals.normalizePaymentStatus('pending'), 'pending');
  assert.equal(__profileControllerInternals.normalizePaymentStatus('other'), 'not_configured');

  const serialized = __profileControllerInternals.serializePaymentMethod({
    stripeRef: 'cus_test',
    status: 'ready',
    brand: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2030,
    lastCheckoutSessionId: 'cs_test',
    lastSyncAt: new Date('2026-03-24T10:00:00.000Z')
  });
  assert.equal(serialized.customerId, 'cus_test');
  assert.equal(serialized.status, 'ready');
  assert.equal(serialized.card?.last4, '4242');

  const invoice = {
    id: 'invoice-1',
    number: 'INV-2026-001',
    serviceLabel: 'Vidange',
    issuedAt: '2026-03-24',
    appointmentDate: '2026-03-28',
    vehicleLabel: 'Honda Civic',
    subtotalAmount: 79,
    taxAmount: 11.85,
    totalAmount: 90.85,
    currency: 'CAD',
    status: 'paid' as const,
    paymentLabel: 'Paiement atelier',
    lineItems: [
      {
        label: 'Forfait vidange',
        quantity: 1,
        unitPrice: 79,
        totalPrice: 79
      }
    ]
  };

  const clonedInvoice = __profileControllerInternals.cloneInvoice(invoice);
  assert.notEqual(clonedInvoice.lineItems, invoice.lineItems);

  const invoiceSummaries = __profileControllerInternals.getInvoiceSummaries([invoice]);
  assert.equal(invoiceSummaries.length, 1);
  assert.equal(invoiceSummaries[0]?.id, 'invoice-1');
  assert.equal(__profileControllerInternals.findInvoiceById([invoice], 'invoice-1')?.number, 'INV-2026-001');
  assert.equal(__profileControllerInternals.findInvoiceById([invoice], 'missing'), null);

  assert.equal(__profileControllerInternals.escapePdfText('Montant (CAD) \\ total'), 'Montant \\(CAD\\) \\\\ total');
  assert.equal(__profileControllerInternals.formatPdfAmount(90.856, 'CAD'), '90.86 CAD');

  const pdfBuffer = __profileControllerInternals.buildPdfDocument(['Facture test', 'Merci']);
  assert.match(pdfBuffer.toString('utf8', 0, 8), /%PDF-1\.4/);

  const invoicePdf = __profileControllerInternals.buildInvoicePdf(invoice, {
    id: 'user-1',
    fullName: 'Integration User',
    email: 'integration@example.com',
    phone: '+1 514 555 0000',
    membershipLabel: 'Client',
    verified: true,
    memberSince: '2026-01-01',
    preferredGarage: 'Garage Centre',
    defaultVehicleLabel: 'Honda Civic',
    appointmentCount: 1,
    vehicleCount: 1,
    loyaltyPoints: 60,
    addressLine: '245 Rue du Centre',
    city: 'Montreal, QC',
    notes: 'Notes'
  }, serialized);
  assert.match(invoicePdf.toString('utf8', 0, 16), /%PDF-1\.4/);

  assert.equal(__profileControllerInternals.mapMembershipLabel(Role.ADMIN), 'Administrateur');
  assert.equal(__profileControllerInternals.mapMembershipLabel(Role.MECHANIC), 'Technicien');
  assert.equal(__profileControllerInternals.mapMembershipLabel(Role.USER), 'Client');

  assert.deepEqual(
    __profileControllerInternals.buildReservationInvoiceAmounts(
      new Prisma.Decimal('90.85'),
      79
    ),
    {
      subtotalAmount: 79,
      taxAmount: 11.85,
      totalAmount: 90.85
    }
  );
  assert.deepEqual(
    __profileControllerInternals.buildReservationInvoiceAmounts(
      new Prisma.Decimal('115.00'),
      null
    ),
    {
      subtotalAmount: 100,
      taxAmount: 15,
      totalAmount: 115
    }
  );

  assert.equal(
    __profileControllerInternals.buildInvoiceNumber('reservation-test-123', new Date('2026-03-24T00:00:00.000Z')),
    'INV-2026-EST123'
  );
});
