import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { resolve } from 'node:path';
import { Client } from 'pg';
import dotenv from 'dotenv';

const backendDir = resolve(__dirname, '..', '..');
dotenv.config({ path: resolve(backendDir, '.env') });

const baseDatabaseUrl = process.env.DATABASE_URL ?? '';
const canRunIntegration = baseDatabaseUrl.trim().length > 0;
const runIntegrationTest = canRunIntegration ? test : test.skip;

let tempDatabaseName = '';
let tempDatabaseUrl = '';
let server: Server | null = null;
let baseUrl = '';
let prismaClient: { $disconnect(): Promise<void> } | null = null;
let prismaPool: { end(): Promise<void> } | null = null;

function getPrismaCommand() {
  return resolve(
    backendDir,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'prisma.cmd' : 'prisma'
  );
}

function buildAdminDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  url.pathname = '/postgres';
  return url.toString();
}

function buildTempDatabaseUrl(databaseUrl: string, databaseName: string) {
  const url = new URL(databaseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

async function createTempDatabase() {
  const admin = new Client({ connectionString: buildAdminDatabaseUrl(baseDatabaseUrl) });
  tempDatabaseName = `garage_integration_${randomBytes(4).toString('hex')}`;

  await admin.connect();
  await admin.query(`CREATE DATABASE ${tempDatabaseName}`);
  await admin.end();

  tempDatabaseUrl = buildTempDatabaseUrl(baseDatabaseUrl, tempDatabaseName);
}

function applyMigrations() {
  execSync(
    `"${getPrismaCommand()}" migrate deploy`,
    {
      cwd: backendDir,
      env: {
        ...process.env,
        DATABASE_URL: tempDatabaseUrl
      },
      stdio: 'pipe',
      shell: process.platform === 'win32' ? process.env.ComSpec ?? 'cmd.exe' : '/bin/sh'
    }
  );
}

async function startHttpApp() {
  process.env.DATABASE_URL = tempDatabaseUrl;

  const { createHttpApp } = await import('../src/core/http/createHttpApp');
  const { prisma, prismaPool: importedPrismaPool } = await import('../src/data/prisma/client');
  prismaClient = prisma;
  prismaPool = importedPrismaPool;

  const app = createHttpApp();
  server = app.listen(0);
  await once(server, 'listening');

  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
}

async function stopHttpApp() {
  if (server) {
    await new Promise<void>((resolveServerClose, rejectServerClose) => {
      server?.close(error => {
        if (error) {
          rejectServerClose(error);
          return;
        }
        resolveServerClose();
      });
    });
    server = null;
  }

  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = null;
  }

  if (prismaPool) {
    await prismaPool.end();
    prismaPool = null;
  }
}

async function dropTempDatabase() {
  if (!tempDatabaseName) {
    return;
  }

  const admin = new Client({ connectionString: buildAdminDatabaseUrl(baseDatabaseUrl) });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${tempDatabaseName} WITH (FORCE)`);
  await admin.end();
}

async function apiRequest<T = unknown>(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
  } = {}
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) as T : null;
  return { response, payload };
}

async function registerUser() {
  const email = `integration-${randomBytes(4).toString('hex')}@example.com`;
  const { response, payload } = await apiRequest<{
    accessToken: string;
    refreshToken: string;
    user: { email: string; id: string; fullName: string };
  }>('/api/auth/register', {
    method: 'POST',
    body: {
      fullName: 'Integration User',
      email,
      phone: '+1 514 555 9999',
      password: 'Garage123!'
    }
  });

  assert.equal(response.status, 201);
  assert.equal(payload?.user.email, email);
  assert.ok(payload?.accessToken);
  assert.ok(payload?.refreshToken);

  return {
    email,
    accessToken: payload!.accessToken,
    refreshToken: payload!.refreshToken
  };
}

before(async () => {
  if (!canRunIntegration) {
    return;
  }

  await createTempDatabase();
  applyMigrations();
  await startHttpApp();
});

after(async () => {
  if (!canRunIntegration) {
    return;
  }

  await stopHttpApp();
  await dropTempDatabase();
});

runIntegrationTest('register, login refresh and profile flow work through HTTP', async () => {
  const session = await registerUser();

  const loginResult = await apiRequest<{
    accessToken: string;
    refreshToken: string;
    user: { email: string };
  }>('/api/auth/login', {
    method: 'POST',
    body: {
      email: session.email,
      password: 'Garage123!'
    }
  });

  assert.equal(loginResult.response.status, 200);
  assert.equal(loginResult.payload?.user.email, session.email);
  assert.ok(loginResult.payload?.accessToken);

  const refreshResult = await apiRequest<{
    accessToken: string;
    refreshToken: string;
    user: { email: string };
  }>('/api/auth/refresh', {
    method: 'POST',
    body: {
      refreshToken: loginResult.payload?.refreshToken
    }
  });

  assert.equal(refreshResult.response.status, 200);
  assert.equal(refreshResult.payload?.user.email, session.email);

  const initialProfileResult = await apiRequest<{
    email: string;
    appointmentCount: number;
    vehicleCount: number;
    loyaltyPoints: number;
  }>('/api/profile', {
    token: loginResult.payload?.accessToken
  });

  assert.equal(initialProfileResult.response.status, 200);
  assert.equal(initialProfileResult.payload?.email, session.email);
  assert.equal(initialProfileResult.payload?.appointmentCount, 0);
  assert.equal(initialProfileResult.payload?.vehicleCount, 0);
  assert.equal(initialProfileResult.payload?.loyaltyPoints, 0);

  const updatedEmail = `updated-${randomBytes(4).toString('hex')}@example.com`;
  const updateProfileResult = await apiRequest<{
    fullName: string;
    email: string;
    phone: string;
    addressLine: string;
    city: string;
    preferredGarage: string;
    notes: string;
  }>('/api/profile', {
    method: 'PUT',
    token: loginResult.payload?.accessToken,
    body: {
      fullName: 'Integration User Updated',
      email: updatedEmail,
      phone: '+1 438 555 2026',
      addressLine: '500 Rue de Test',
      city: 'Quebec, QC',
      preferredGarage: 'Garage Quebec Centre',
      notes: 'Profil modifie depuis le test integration.'
    }
  });

  assert.equal(updateProfileResult.response.status, 200);
  assert.equal(updateProfileResult.payload?.fullName, 'Integration User Updated');
  assert.equal(updateProfileResult.payload?.email, updatedEmail);
  assert.equal(updateProfileResult.payload?.phone, '+1 438 555 2026');
  assert.equal(updateProfileResult.payload?.addressLine, '500 Rue de Test');
  assert.equal(updateProfileResult.payload?.city, 'Quebec, QC');
  assert.equal(updateProfileResult.payload?.preferredGarage, 'Garage Quebec Centre');
  assert.equal(updateProfileResult.payload?.notes, 'Profil modifie depuis le test integration.');

  const profileResult = await apiRequest<{
    email: string;
    fullName: string;
    phone: string;
    addressLine: string;
    city: string;
    preferredGarage: string;
    notes: string;
  }>('/api/profile', {
    token: loginResult.payload?.accessToken
  });

  assert.equal(profileResult.response.status, 200);
  assert.equal(profileResult.payload?.email, updatedEmail);
  assert.equal(profileResult.payload?.fullName, 'Integration User Updated');
  assert.equal(profileResult.payload?.phone, '+1 438 555 2026');
  assert.equal(profileResult.payload?.addressLine, '500 Rue de Test');
  assert.equal(profileResult.payload?.city, 'Quebec, QC');
  assert.equal(profileResult.payload?.preferredGarage, 'Garage Quebec Centre');
  assert.equal(profileResult.payload?.notes, 'Profil modifie depuis le test integration.');

  const refreshedAfterProfileUpdate = await apiRequest<{
    accessToken: string;
    refreshToken: string;
    user: { email: string };
  }>('/api/auth/refresh', {
    method: 'POST',
    body: {
      refreshToken: loginResult.payload?.refreshToken
    }
  });

  assert.equal(refreshedAfterProfileUpdate.response.status, 200);
  assert.equal(refreshedAfterProfileUpdate.payload?.user.email, updatedEmail);

  const invoicesResult = await apiRequest<unknown[]>('/api/profile/invoices', {
    token: loginResult.payload?.accessToken
  });

  assert.equal(invoicesResult.response.status, 200);
  assert.deepEqual(invoicesResult.payload, []);
});

runIntegrationTest('authenticated user can create reservations and reviews through HTTP', async () => {
  const session = await registerUser();

  const createVehicleResult = await apiRequest<{
    id: string;
    name: string;
  }>('/api/vehicles', {
    method: 'POST',
    token: session.accessToken,
    body: {
      name: 'Toyota Corolla',
      model: 'Corolla 2018',
      year: 2018,
      mileage: 75000,
      type: 'sedan',
      licensePlate: 'TEST-123',
      fuelType: 'Essence'
    }
  });
  assert.equal(createVehicleResult.response.status, 201);
  assert.ok(createVehicleResult.payload?.id);

  const servicesResult = await apiRequest<Array<{ id: string; label: string }>>(
    '/api/reservations/services'
  );
  assert.equal(servicesResult.response.status, 200);
  assert.ok(Array.isArray(servicesResult.payload));
  assert.ok(servicesResult.payload?.some(service => service.id === 'oil-change'));

  const slotsResult = await apiRequest<string[]>(
    '/api/reservations/slots?serviceId=oil-change&date=2026-04-15'
  );
  assert.equal(slotsResult.response.status, 200);
  assert.deepEqual(slotsResult.payload, ['08:30', '10:00', '13:30', '15:00']);

  const createReservationResult = await apiRequest<{
    id: string;
    serviceId: string;
    serviceLabel: string;
    vehicleId?: string;
    vehicleLabel?: string;
    date: string;
    time: string;
    status: string;
  }>('/api/reservations', {
    method: 'POST',
    token: session.accessToken,
    body: {
      serviceId: 'oil-change',
      vehicleId: createVehicleResult.payload?.id,
      date: '2026-04-15',
      time: '10:00',
      notes: 'Integration test reservation'
    }
  });

  assert.equal(createReservationResult.response.status, 201);
  assert.equal(createReservationResult.payload?.serviceId, 'oil-change');
  assert.equal(createReservationResult.payload?.serviceLabel, 'Vidange');
  assert.equal(createReservationResult.payload?.vehicleId, createVehicleResult.payload?.id);
  assert.equal(createReservationResult.payload?.status, 'confirmed');

  const reservationsResult = await apiRequest<Array<{ id: string; serviceId: string; vehicleId?: string }>>(
    '/api/reservations',
    {
      token: session.accessToken
    }
  );

  assert.equal(reservationsResult.response.status, 200);
  assert.equal(reservationsResult.payload?.length, 1);
  assert.equal(reservationsResult.payload?.[0]?.id, createReservationResult.payload?.id);
  assert.equal(reservationsResult.payload?.[0]?.vehicleId, createVehicleResult.payload?.id);

  const editableSlotsResult = await apiRequest<string[]>(
    `/api/reservations/slots?serviceId=oil-change&date=2026-04-15&excludeId=${createReservationResult.payload?.id}`,
    {
      token: session.accessToken
    }
  );
  assert.equal(editableSlotsResult.response.status, 200);
  assert.ok(editableSlotsResult.payload?.includes('10:00'));

  const updateReservationResult = await apiRequest<{
    id: string;
    serviceId: string;
    vehicleId?: string;
    date: string;
    time: string;
    status: string;
  }>(`/api/reservations/${createReservationResult.payload?.id}`, {
    method: 'PATCH',
    token: session.accessToken,
    body: {
      date: '2026-04-15',
      time: '13:30',
      vehicleId: createVehicleResult.payload?.id
    }
  });

  assert.equal(updateReservationResult.response.status, 200);
  assert.equal(updateReservationResult.payload?.id, createReservationResult.payload?.id);
  assert.equal(updateReservationResult.payload?.time, '13:30');
  assert.equal(updateReservationResult.payload?.vehicleId, createVehicleResult.payload?.id);

  const reviewCreateResult = await apiRequest<{
    reservationId: string;
    rating: number;
    comment: string | null;
  }>('/api/reviews', {
    method: 'POST',
    token: session.accessToken,
    body: {
      reservationId: createReservationResult.payload?.id,
      rating: 5,
      comment: 'Service de test tres propre.'
    }
  });

  assert.equal(reviewCreateResult.response.status, 201);
  assert.equal(reviewCreateResult.payload?.reservationId, createReservationResult.payload?.id);
  assert.equal(reviewCreateResult.payload?.rating, 5);

  const reviewsResult = await apiRequest<
    Array<{ reservationId: string; reservationLabel: string; rating: number }>
  >('/api/reviews', {
    token: session.accessToken
  });

  assert.equal(reviewsResult.response.status, 200);
  assert.equal(reviewsResult.payload?.length, 1);
  assert.equal(reviewsResult.payload?.[0]?.reservationId, createReservationResult.payload?.id);
  assert.equal(reviewsResult.payload?.[0]?.reservationLabel, 'Vidange');

  const profileResult = await apiRequest<{ appointmentCount: number }>('/api/profile', {
    token: session.accessToken
  });

  assert.equal(profileResult.response.status, 200);
  assert.equal(profileResult.payload?.appointmentCount, 1);

  const invoicesResult = await apiRequest<Array<{ id: string; serviceLabel: string }>>(
    '/api/profile/invoices',
    {
      token: session.accessToken
    }
  );

  assert.equal(invoicesResult.response.status, 200);
  assert.equal(invoicesResult.payload?.length, 1);
  assert.equal(invoicesResult.payload?.[0]?.serviceLabel, 'Vidange');
});
