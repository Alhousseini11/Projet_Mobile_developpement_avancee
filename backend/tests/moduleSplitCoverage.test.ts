import test from 'node:test';
import assert from 'node:assert/strict';
import { Role } from '@prisma/client';
import { env } from '../src/config/env';
import { logger } from '../src/config/logger';
import { prisma } from '../src/data/prisma/client';
import { AppError } from '../src/shared/errors';

const stripeClientModule = require('../src/data/stripe/stripeClient') as typeof import('../src/data/stripe/stripeClient');
const schemaCapabilitiesModule = require('../src/modules/_shared/schemaCapabilities') as typeof import('../src/modules/_shared/schemaCapabilities');
const schemaDriftErrorModule = require('../src/modules/_shared/isSchemaDriftError') as typeof import('../src/modules/_shared/isSchemaDriftError');
const authServiceModule = require('../src/modules/auth/auth.service') as typeof import('../src/modules/auth/auth.service');
const reservationsControllerModule = require('../src/modules/reservations/reservations.controller') as typeof import('../src/modules/reservations/reservations.controller');
const profileCoreModule = require('../src/modules/profile/profile.core') as typeof import('../src/modules/profile/profile.core');
const profilePaymentsModule = require('../src/modules/profile/profile.payments') as typeof import('../src/modules/profile/profile.payments');
const tutorialsCatalogModule = require('../src/modules/tutorials/tutorials.catalog') as typeof import('../src/modules/tutorials/tutorials.catalog');

function createResponseRecorder() {
  const state = {
    statusCode: 200,
    jsonPayload: undefined as unknown,
    sentPayload: undefined as unknown,
    headers: new Map<string, string>(),
    ended: false
  };

  const response = {
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      state.jsonPayload = payload;
      return this;
    },
    send(payload: unknown) {
      state.sentPayload = payload;
      return this;
    },
    setHeader(name: string, value: string) {
      state.headers.set(name.toLowerCase(), value);
      return this;
    },
    end() {
      state.ended = true;
      return this;
    }
  };

  return {
    response: response as any,
    state
  };
}

function configureStripeEnv() {
  const original = {
    STRIPE_KEY: env.STRIPE_KEY,
    STRIPE_SUCCESS_URL: env.STRIPE_SUCCESS_URL,
    STRIPE_CANCEL_URL: env.STRIPE_CANCEL_URL
  };

  env.STRIPE_KEY = 'sk_test_module_split';
  env.STRIPE_SUCCESS_URL = 'https://garage.example.com/success';
  env.STRIPE_CANCEL_URL = 'https://garage.example.com/cancel';

  return () => {
    env.STRIPE_KEY = original.STRIPE_KEY;
    env.STRIPE_SUCCESS_URL = original.STRIPE_SUCCESS_URL;
    env.STRIPE_CANCEL_URL = original.STRIPE_CANCEL_URL;
  };
}

function replaceMethod(
  object: Record<string, any>,
  methodName: string,
  implementation: (...args: any[]) => any
) {
  const original = object[methodName];
  object[methodName] = implementation;

  return () => {
    object[methodName] = original;
  };
}

test('module split coverage closes payment, profile core and tutorial catalog gaps', async t => {
  await t.test('resolveProfileUser rejects unauthenticated requests', async t => {
    t.after(replaceMethod(authServiceModule, 'resolveOptionalRequestUser', async () => null));

    await assert.rejects(
      () => profileCoreModule.resolveProfileUser({} as any),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.status, 401);
        assert.match(error.message, /authentification requise/i);
        return true;
      }
    );
  });

  await t.test('buildProfileResponseForUser composes current vehicle schema data', async t => {
    t.after(replaceMethod(schemaCapabilitiesModule, 'isCurrentVehicleSchemaAvailable', async () => true));
    t.after(replaceMethod(prisma.userProfileSettings as any, 'findUnique', async () => null));
    t.after(replaceMethod(prisma.vehicle as any, 'count', async () => 2));
    t.after(replaceMethod(prisma.vehicle as any, 'findFirst', async () => ({
      name: 'Mazda',
      model: '3'
    })));
    t.after(replaceMethod(reservationsControllerModule, 'getReservationCountForUser', async () => 3));

    const payload = await profileCoreModule.buildProfileResponseForUser({
      id: 'user-current',
      email: 'current@example.com',
      fullName: 'Current User',
      phone: null,
      role: Role.USER,
      createdAt: new Date('2026-04-01T10:00:00.000Z')
    });

    assert.equal(payload.membershipLabel, 'Client');
    assert.equal(payload.phone.length > 0, true);
    assert.equal(payload.vehicleCount, 2);
    assert.equal(payload.appointmentCount, 3);
    assert.equal(payload.defaultVehicleLabel, 'Mazda 3');
    assert.equal(payload.loyaltyPoints, 240);
    assert.equal(payload.memberSince, '2026-04-01');
  });

  await t.test('buildProfileResponseForUser supports legacy vehicle schema fallbacks', async t => {
    let queryCallCount = 0;

    t.after(replaceMethod(schemaCapabilitiesModule, 'isCurrentVehicleSchemaAvailable', async () => false));
    t.after(replaceMethod(prisma.userProfileSettings as any, 'findUnique', async () => ({
      membershipLabel: 'Client legacy',
      verified: false,
      memberSince: new Date('2026-02-14T00:00:00.000Z'),
      preferredGarage: 'Garage Legacy',
      defaultVehicleLabel: null,
      loyaltyPoints: 999,
      addressLine: '12 Rue Legacy',
      city: 'Quebec, QC',
      notes: 'Profil migre'
    })));
    t.after(replaceMethod(prisma as any, '$queryRaw', async () => {
      queryCallCount += 1;

      if (queryCallCount === 1) {
        return [{ count: 1 }];
      }

      return [{ name: 'Toyota', model: 'Corolla' }];
    }));
    t.after(replaceMethod(reservationsControllerModule, 'getReservationCountForUser', async () => 4));

    const payload = await profileCoreModule.buildProfileResponseForUser({
      id: 'user-legacy',
      email: 'legacy@example.com',
      fullName: 'Legacy User',
      phone: '+1 418 555 0000',
      role: Role.USER,
      createdAt: new Date('2026-01-01T00:00:00.000Z')
    });

    assert.equal(queryCallCount, 2);
    assert.equal(payload.membershipLabel, 'Client legacy');
    assert.equal(payload.verified, false);
    assert.equal(payload.vehicleCount, 1);
    assert.equal(payload.appointmentCount, 4);
    assert.equal(payload.defaultVehicleLabel, 'Toyota Corolla');
    assert.equal(payload.loyaltyPoints, 999);
    assert.equal(payload.preferredGarage, 'Garage Legacy');
    assert.equal(payload.addressLine, '12 Rue Legacy');
    assert.equal(payload.city, 'Quebec, QC');
    assert.equal(payload.notes, 'Profil migre');
    assert.equal(payload.memberSince, '2026-02-14');
  });

  await t.test('createPaymentCheckoutSession creates a Stripe setup session and persists pending state', async t => {
    const restoreStripeEnv = configureStripeEnv();
    t.after(restoreStripeEnv);

    const upsertCalls: Array<Record<string, unknown>> = [];
    let createdCustomerArgs: Record<string, any> | null = null;
    let createdSessionArgs: Record<string, any> | null = null;

    t.after(replaceMethod(profileCoreModule, 'resolveProfileUser', async () => ({
      id: 'pay-user',
      email: 'pay@example.com',
      fullName: 'Payment User',
      phone: '+1 514 555 0101',
      role: Role.USER,
      createdAt: new Date('2026-04-01T00:00:00.000Z')
    })));
    t.after(replaceMethod(profileCoreModule, 'buildProfileResponseForUser', async () => ({
      id: 'pay-user',
      email: 'pay@example.com',
      fullName: 'Payment User',
      phone: '+1 514 555 0101',
      membershipLabel: 'Client',
      verified: true,
      memberSince: '2026-04-01',
      preferredGarage: 'Garage Centre',
      defaultVehicleLabel: 'Mazda 3',
      appointmentCount: 1,
      vehicleCount: 1,
      loyaltyPoints: 90,
      addressLine: '1 Rue du Test',
      city: 'Montreal, QC',
      notes: 'Notes'
    })));
    t.after(replaceMethod(prisma.paymentMethod as any, 'findUnique', async () => null));
    t.after(replaceMethod(prisma.paymentMethod as any, 'upsert', async (args: any) => {
      upsertCalls.push(args as Record<string, unknown>);
      return args;
    }));
    t.after(replaceMethod(stripeClientModule, 'createStripeClient', () => ({
      customers: {
        create: async (args: Record<string, any>) => {
          createdCustomerArgs = args;
          return { id: 'cus_module_split' };
        }
      },
      checkout: {
        sessions: {
          create: async (args: Record<string, any>) => {
            createdSessionArgs = args;
            return {
              id: 'cs_module_split',
              url: 'https://stripe.example.com/setup/cs_module_split'
            };
          }
        }
      }
    }) as any));

    const { response, state } = createResponseRecorder();

    await profilePaymentsModule.createPaymentCheckoutSession(
      { body: {} } as any,
      response
    );

    assert.equal(state.statusCode, 201);
    assert.deepEqual(state.jsonPayload, {
      sessionId: 'cs_module_split',
      url: 'https://stripe.example.com/setup/cs_module_split',
      mode: 'setup'
    });
    assert.ok(createdCustomerArgs);
    assert.ok(createdSessionArgs);
    assert.equal(createdCustomerArgs['email'], 'pay@example.com');
    assert.deepEqual(createdCustomerArgs['metadata'], { userId: 'pay-user' });
    assert.equal(createdSessionArgs['customer'], 'cus_module_split');
    assert.equal(createdSessionArgs['success_url'], 'https://garage.example.com/success');
    assert.equal(createdSessionArgs['cancel_url'], 'https://garage.example.com/cancel');
    assert.equal(upsertCalls.length, 2);
    assert.equal((upsertCalls[0]?.create as Record<string, unknown>).status, 'not_configured');
    assert.equal((upsertCalls[1]?.update as Record<string, unknown>).status, 'pending');
  });

  await t.test('createPaymentCheckoutSession returns 500 when Stripe does not return a URL', async t => {
    const restoreStripeEnv = configureStripeEnv();
    t.after(restoreStripeEnv);

    let upsertCallCount = 0;

    t.after(replaceMethod(profileCoreModule, 'resolveProfileUser', async () => ({
      id: 'pay-user',
      email: 'pay@example.com',
      fullName: 'Payment User',
      phone: '+1 514 555 0101',
      role: Role.USER,
      createdAt: new Date('2026-04-01T00:00:00.000Z')
    })));
    t.after(replaceMethod(profileCoreModule, 'buildProfileResponseForUser', async () => ({
      id: 'pay-user',
      email: 'pay@example.com',
      fullName: 'Payment User',
      phone: '+1 514 555 0101',
      membershipLabel: 'Client',
      verified: true,
      memberSince: '2026-04-01',
      preferredGarage: 'Garage Centre',
      defaultVehicleLabel: 'Mazda 3',
      appointmentCount: 1,
      vehicleCount: 1,
      loyaltyPoints: 90,
      addressLine: '1 Rue du Test',
      city: 'Montreal, QC',
      notes: 'Notes'
    })));
    t.after(replaceMethod(prisma.paymentMethod as any, 'findUnique', async () => ({
      stripeRef: 'cus_existing'
    })));
    t.after(replaceMethod(prisma.paymentMethod as any, 'upsert', async (args: any) => {
      upsertCallCount += 1;
      return args;
    }));
    t.after(replaceMethod(stripeClientModule, 'createStripeClient', () => ({
      checkout: {
        sessions: {
          create: async () => ({
            id: 'cs_missing_url',
            url: null
          })
        }
      }
    }) as any));

    const { response, state } = createResponseRecorder();

    await profilePaymentsModule.createPaymentCheckoutSession(
      { body: {} } as any,
      response
    );

    assert.equal(state.statusCode, 500);
    assert.deepEqual(state.jsonPayload, {
      message: 'Stripe session URL was not returned'
    });
    assert.equal(upsertCallCount, 0);
  });

  await t.test('syncPaymentMethod returns pending status for incomplete Stripe setup', async t => {
    const restoreStripeEnv = configureStripeEnv();
    t.after(restoreStripeEnv);

    const paymentRecords = [
      {
        stripeRef: 'cus_pending',
        lastCheckoutSessionId: 'cs_pending'
      },
      {
        stripeRef: 'cus_pending',
        status: 'pending',
        brand: null,
        last4: null,
        expMonth: null,
        expYear: null,
        lastCheckoutSessionId: 'cs_pending',
        lastSyncAt: new Date('2026-04-14T09:30:00.000Z')
      }
    ];
    const upsertCalls: Array<Record<string, unknown>> = [];

    t.after(replaceMethod(profileCoreModule, 'resolveProfileUser', async () => ({
      id: 'pay-user',
      email: 'pay@example.com',
      fullName: 'Payment User',
      phone: '+1 514 555 0101',
      role: Role.USER,
      createdAt: new Date('2026-04-01T00:00:00.000Z')
    })));
    t.after(replaceMethod(prisma.paymentMethod as any, 'findUnique', async () => paymentRecords.shift() ?? null));
    t.after(replaceMethod(prisma.paymentMethod as any, 'upsert', async (args: any) => {
      upsertCalls.push(args as Record<string, unknown>);
      return args;
    }));
    t.after(replaceMethod(stripeClientModule, 'createStripeClient', () => ({
      checkout: {
        sessions: {
          retrieve: async () => ({
            id: 'cs_pending',
            status: 'open',
            customer: 'cus_pending',
            setup_intent: null
          })
        }
      }
    }) as any));

    const { response, state } = createResponseRecorder();

    await profilePaymentsModule.syncPaymentMethod(
      { body: {} } as any,
      response
    );

    assert.equal(state.statusCode, 202);
    assert.equal((state.jsonPayload as Record<string, unknown>).status, 'pending');
    assert.equal(upsertCalls.length, 1);
    assert.equal((upsertCalls[0]?.update as Record<string, unknown>).status, 'pending');
  });

  await t.test('syncPaymentMethod persists ready card details for a completed Stripe setup', async t => {
    const restoreStripeEnv = configureStripeEnv();
    t.after(restoreStripeEnv);

    const paymentRecords = [
      {
        stripeRef: 'cus_ready',
        lastCheckoutSessionId: 'cs_ready'
      },
      {
        stripeRef: 'cus_ready',
        status: 'ready',
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2030,
        lastCheckoutSessionId: 'cs_ready',
        lastSyncAt: new Date('2026-04-14T10:00:00.000Z')
      }
    ];
    const upsertCalls: Array<Record<string, unknown>> = [];

    t.after(replaceMethod(profileCoreModule, 'resolveProfileUser', async () => ({
      id: 'pay-user',
      email: 'pay@example.com',
      fullName: 'Payment User',
      phone: '+1 514 555 0101',
      role: Role.USER,
      createdAt: new Date('2026-04-01T00:00:00.000Z')
    })));
    t.after(replaceMethod(prisma.paymentMethod as any, 'findUnique', async () => paymentRecords.shift() ?? null));
    t.after(replaceMethod(prisma.paymentMethod as any, 'upsert', async (args: any) => {
      upsertCalls.push(args as Record<string, unknown>);
      return args;
    }));
    t.after(replaceMethod(stripeClientModule, 'createStripeClient', () => ({
      checkout: {
        sessions: {
          retrieve: async () => ({
            id: 'cs_ready',
            status: 'complete',
            customer: { id: 'cus_ready' },
            setup_intent: {
              payment_method: {
                type: 'card',
                card: {
                  brand: 'visa',
                  last4: '4242',
                  exp_month: 12,
                  exp_year: 2030
                }
              }
            }
          })
        }
      }
    }) as any));

    const { response, state } = createResponseRecorder();

    await profilePaymentsModule.syncPaymentMethod(
      { body: { sessionId: 'cs_ready' } } as any,
      response
    );

    assert.equal(state.statusCode, 200);
    assert.equal((state.jsonPayload as Record<string, unknown>).status, 'ready');
    assert.equal(
      ((state.jsonPayload as Record<string, any>).card as Record<string, unknown>).last4,
      '4242'
    );
    assert.equal(upsertCalls.length, 1);
    assert.equal((upsertCalls[0]?.update as Record<string, unknown>).status, 'ready');
    assert.equal((upsertCalls[0]?.update as Record<string, unknown>).brand, 'visa');
  });

  await t.test('readTutorialCatalog returns current schema tutorials when available', async t => {
    t.after(replaceMethod(schemaCapabilitiesModule, 'isCurrentTutorialSchemaAvailable', async () => true));
    t.after(replaceMethod(prisma.tutorial as any, 'findMany', async () => [
      {
        id: 'tutorial-current',
        title: 'Verifier la batterie',
        description: 'Tutoriel courant',
        category: 'battery',
        difficulty: 'easy',
        duration: 13,
        views: 4,
        rating: 4.5,
        thumbnail: '',
        videoUrl: 'https://example.com/tutorial-current',
        instructions: ['Couper le moteur', 42],
        tools: ['Multimetre', null],
        createdAt: new Date('2026-04-10T10:00:00.000Z'),
        updatedAt: new Date('2026-04-10T11:00:00.000Z')
      }
    ]));

    const tutorials = await tutorialsCatalogModule.readTutorialCatalog();

    assert.equal(tutorials.length, 1);
    assert.equal(tutorials[0]?.id, 'tutorial-current');
    assert.equal(tutorials[0]?.category, 'batterie');
    assert.equal(tutorials[0]?.difficulty, 'facile');
    assert.equal(tutorials[0]?.thumbnail, 'res://logo');
    assert.deepEqual(tutorials[0]?.tools, ['Multimetre']);
  });

  await t.test('readTutorialCatalog uses legacy tutorials when the current schema is unavailable', async t => {
    t.after(replaceMethod(schemaCapabilitiesModule, 'isCurrentTutorialSchemaAvailable', async () => false));
    t.after(replaceMethod(prisma as any, '$queryRaw', async () => [
      {
        id: 'tutorial-legacy',
        title: 'Tutoriel legacy',
        category: 'maintenance',
        difficulty: 'hard',
        videoUrl: null,
        thumbnail: null,
        durationSec: 480,
        createdAt: '2026-04-09T10:00:00.000Z'
      }
    ]));

    const tutorials = await tutorialsCatalogModule.readTutorialCatalog();

    assert.equal(tutorials.length, 1);
    assert.equal(tutorials[0]?.id, 'tutorial-legacy');
    assert.equal(tutorials[0]?.category, 'entretien');
    assert.equal(tutorials[0]?.difficulty, 'difficile');
    assert.equal(tutorials[0]?.duration, 8);
    assert.match(tutorials[0]?.videoUrl ?? '', /example\.com\/videos\/tutorial/i);
  });

  await t.test('readTutorialCatalog falls back to legacy tutorials on schema drift', async t => {
    t.after(replaceMethod(logger as any, 'warn', () => undefined as any));
    t.after(replaceMethod(logger as any, 'error', () => undefined as any));
    t.after(replaceMethod(schemaCapabilitiesModule, 'isCurrentTutorialSchemaAvailable', async () => true));
    t.after(replaceMethod(prisma.tutorial as any, 'findMany', async () => {
      throw new Error('current schema drift');
    }));
    t.after(replaceMethod(schemaDriftErrorModule, 'isSchemaDriftError', () => true));
    t.after(replaceMethod(prisma as any, '$queryRaw', async () => [
      {
        id: 'tutorial-drift-legacy',
        title: 'Tutoriel legacy apres drift',
        category: 'fluid',
        difficulty: 'medium',
        videoUrl: 'https://example.com/tutorial-drift',
        thumbnail: 'https://example.com/tutorial-drift.png',
        durationSec: 300,
        createdAt: '2026-04-08T10:00:00.000Z'
      }
    ]));

    const tutorials = await tutorialsCatalogModule.readTutorialCatalog();

    assert.equal(tutorials.length, 1);
    assert.equal(tutorials[0]?.id, 'tutorial-drift-legacy');
    assert.equal(tutorials[0]?.category, 'fluide');
    assert.equal(tutorials[0]?.difficulty, 'moyen');
  });

  await t.test('readTutorialCatalog returns fallback tutorials when the current schema fails without drift', async t => {
    t.after(replaceMethod(logger as any, 'error', () => undefined as any));
    t.after(replaceMethod(schemaCapabilitiesModule, 'isCurrentTutorialSchemaAvailable', async () => true));
    t.after(replaceMethod(prisma.tutorial as any, 'findMany', async () => {
      throw new Error('database unavailable');
    }));
    t.after(replaceMethod(schemaDriftErrorModule, 'isSchemaDriftError', () => false));

    const tutorials = await tutorialsCatalogModule.readTutorialCatalog();

    assert.ok((tutorials.length ?? 0) >= 1);
    assert.equal(tutorials[0]?.id, 'tutorial-brakes-fallback');
    assert.equal(tutorials[0]?.category, 'freins');
  });
});
