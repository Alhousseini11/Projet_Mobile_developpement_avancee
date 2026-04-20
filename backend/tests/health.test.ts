import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHealthCheckPayload } from '../src/core/http/health';

test('buildHealthCheckPayload returns a stable degraded payload when the database is down', () => {
  const timestamp = new Date('2026-04-19T03:45:00.000Z');
  const payload = buildHealthCheckPayload({
    dbStatus: 'down',
    timestamp,
    environment: 'production'
  });

  assert.deepEqual(payload, {
    ok: false,
    status: 'degraded',
    service: 'garage-mechanic-backend',
    environment: 'production',
    timestamp: '2026-04-19T03:45:00.000Z',
    checks: {
      app: {
        status: 'up'
      },
      db: {
        status: 'down'
      }
    }
  });
});
