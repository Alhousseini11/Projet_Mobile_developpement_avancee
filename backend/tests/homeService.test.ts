import assert from 'node:assert/strict';
import test from 'node:test';
import { createHomeService } from '../src/modules/home/home.service';
import type { HomeFeedRepository } from '../src/modules/home/home.repository';

function createRepository(overrides: Partial<HomeFeedRepository> = {}): HomeFeedRepository {
  return {
    getNextReservation: async () => null,
    getPrimaryVehicle: async () => null,
    getNextReminder: async () => null,
    ...overrides
  };
}

test('home service builds an enriched feed from reservation and reminder data', async () => {
  const repositoryCalls: string[] = [];
  const service = createHomeService({
    repository: createRepository({
      getNextReservation: async userId => {
        repositoryCalls.push(`reservation:${userId}`);
        return {
          serviceType: 'oil-change_fast-track',
          scheduledAt: new Date(2026, 2, 24, 13, 5, 0)
        };
      },
      getPrimaryVehicle: async userId => {
        repositoryCalls.push(`vehicle:${userId}`);
        return {
          id: 'veh-1',
          name: 'Honda',
          model: 'Civic',
          mileage: 23500
        };
      },
      getNextReminder: async vehicleId => {
        repositoryCalls.push(`reminder:${vehicleId}`);
        return {
          title: 'Verifier la pression',
          dueAt: new Date(2026, 2, 25, 9, 30, 0)
        };
      }
    })
  });

  const payload = await service.getHomeFeed({
    id: 'user-1',
    fullName: '  Jean Dupont  '
  });

  assert.equal(payload.displayName, 'Jean');
  assert.match(payload.nextAppointmentLabel, /Oil Change Fast Track/i);
  assert.match(payload.nextAppointmentLabel, /24 mars/i);
  assert.equal(payload.promoMessage, 'Promos: 20% sur les freins cette semaine.');
  assert.match(payload.reminderMessage, /Verifier la pression/i);
  assert.deepEqual(
    [...repositoryCalls].sort(),
    ['reminder:veh-1', 'reservation:user-1', 'vehicle:user-1']
  );
});

test('home service returns the default feed when the user has no home data', async () => {
  let reminderLookupCount = 0;
  const service = createHomeService({
    repository: createRepository({
      getNextReservation: async () => null,
      getPrimaryVehicle: async () => null,
      getNextReminder: async () => {
        reminderLookupCount += 1;
        return null;
      }
    })
  });

  const payload = await service.getHomeFeed({
    id: 'user-2',
    fullName: 'Integration Test'
  });

  assert.equal(payload.displayName, 'Integration');
  assert.equal(payload.nextAppointmentLabel, 'Aucun rendez-vous planifie pour le moment.');
  assert.equal(payload.promoMessage, 'Promos: 20% sur les freins cette semaine.');
  assert.equal(
    payload.reminderMessage,
    'Rappel: Consultez vos vehicules pour planifier votre prochain entretien.'
  );
  assert.equal(reminderLookupCount, 0);
});

test('home service falls back and logs when a dependency fails', async () => {
  const loggedErrors: Array<{ context: { err: unknown; userId?: string }; message: string }> = [];
  const dependencyFailure = new Error('database unavailable');
  const service = createHomeService({
    repository: createRepository({
      getNextReservation: async () => {
        throw dependencyFailure;
      }
    }),
    logger: {
      error(context, message) {
        loggedErrors.push({ context, message });
      }
    }
  });

  const payload = await service.getHomeFeed({
    id: 'user-3',
    fullName: 'Marie Curie'
  });

  assert.equal(payload.displayName, 'Marie');
  assert.equal(payload.nextAppointmentLabel, 'Aucun rendez-vous planifie pour le moment.');
  assert.equal(
    payload.reminderMessage,
    'Rappel: Consultez vos vehicules pour planifier votre prochain entretien.'
  );
  assert.equal(loggedErrors.length, 1);
  assert.equal(loggedErrors[0]?.message, 'Error building home feed');
  assert.equal(loggedErrors[0]?.context.userId, 'user-3');
  assert.equal(loggedErrors[0]?.context.err, dependencyFailure);
});
