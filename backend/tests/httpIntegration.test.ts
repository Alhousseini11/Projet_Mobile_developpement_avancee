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

process.env.SENDGRID_ENABLED = 'false';
process.env.SENDGRID_API_KEY = '';
process.env.SENDGRID_FROM_EMAIL = '';
process.env.SENDGRID_FROM_NAME = '';
process.env.PASSWORD_RESET_URL = 'http://localhost:3000/reset-password';

const baseDatabaseUrl = process.env.DATABASE_URL ?? '';
const canRunIntegration = baseDatabaseUrl.trim().length > 0;
const runIntegrationTest = canRunIntegration ? test : test.skip;

let tempDatabaseName = '';
let tempDatabaseUrl = '';
let server: Server | null = null;
let baseUrl = '';
let prismaClient: any = null;
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

async function rawRequest(
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

  const body = Buffer.from(await response.arrayBuffer());
  return { response, body };
}

async function formRequest(
  path: string,
  body: Record<string, string>
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(body).toString()
  });

  return {
    response,
    text: await response.text()
  };
}
async function registerUser() {
  const email = `integration-${randomBytes(4).toString('hex')}@example.com`;
  const password = 'Garage123!';
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
      password
    }
  });

  assert.equal(response.status, 201);
  assert.equal(payload?.user.email, email);
  assert.ok(payload?.accessToken);
  assert.ok(payload?.refreshToken);

  return {
    email,
    password,
    accessToken: payload!.accessToken,
    refreshToken: payload!.refreshToken
  };
}

async function createAdminSession() {
  const session = await registerUser();

  await prismaClient.user.update({
    where: {
      email: session.email
    },
    data: {
      role: 'ADMIN'
    }
  });

  const loginResult = await apiRequest<{
    accessToken: string;
    refreshToken: string;
    user: { email: string; role: string };
  }>('/api/auth/login', {
    method: 'POST',
    body: {
      email: session.email,
      password: session.password
    }
  });

  assert.equal(loginResult.response.status, 200);
  assert.equal(loginResult.payload?.user.role, 'ADMIN');

  return {
    ...session,
    accessToken: loginResult.payload!.accessToken,
    refreshToken: loginResult.payload!.refreshToken
  };
}

async function createVehicle(token: string, overrides: Record<string, unknown> = {}) {
  return apiRequest<{
    id: string;
    userId: string;
    name: string;
    model: string;
    year: number;
    mileage: number;
    type: string;
    licensePlate: string | null;
    fuelType: string | null;
  }>('/api/vehicles', {
    method: 'POST',
    token,
    body: {
      name: 'Toyota Corolla',
      model: 'Corolla 2018',
      year: 2018,
      mileage: 75000,
      type: 'sedan',
      licensePlate: 'TEST-123',
      fuelType: 'Essence',
      ...overrides
    }
  });
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

runIntegrationTest('public endpoints, password reset and placeholder routes expose stable responses', async () => {
  const rootResult = await apiRequest<{ ok: boolean; service: string }>('/');
  assert.equal(rootResult.response.status, 200);
  assert.equal(rootResult.payload?.ok, true);
  assert.equal(rootResult.payload?.service, 'garage-mechanic-backend');

  const healthResult = await apiRequest<{ ok: boolean; service: string }>('/health');
  assert.equal(healthResult.response.status, 200);
  assert.equal(healthResult.payload?.ok, true);

  const homeResult = await apiRequest<{
    displayName: string;
    nextAppointmentLabel: string;
    reminderMessage: string;
  }>('/api/home');
  assert.equal(homeResult.response.status, 200);
  assert.equal(homeResult.payload?.displayName, 'Alex');
  assert.match(homeResult.payload?.nextAppointmentLabel ?? '', /Aucun rendez-vous/i);

  const unauthorizedNotificationsResult = await apiRequest<{ message: string }>('/api/notifications');
  assert.equal(unauthorizedNotificationsResult.response.status, 401);

  const placeholderChecks = [
    ['/api/chat', 'chat.list not implemented'],
    ['/api/location', 'location.list not implemented'],
    ['/api/emergency', 'emergency.get not implemented'],
    ['/api/estimation', 'estimation.get not implemented']
  ] as const;

  for (const [path, message] of placeholderChecks) {
    const placeholderResult = await apiRequest<{ message: string }>(path);
    assert.equal(placeholderResult.response.status, 501);
    assert.equal(placeholderResult.payload?.message, message);
  }

  const session = await registerUser();

  const forgotPasswordResult = await apiRequest<{
    message: string;
    resetToken?: string;
    resetCode?: string;
  }>('/api/auth/forgot-password', {
    method: 'POST',
    body: {
      email: session.email
    }
  });

  assert.equal(forgotPasswordResult.response.status, 200);
  assert.match(forgotPasswordResult.payload?.message ?? '', /reinitialisation/i);
  assert.ok(forgotPasswordResult.payload?.resetToken);
  assert.ok(forgotPasswordResult.payload?.resetCode);

  const resetPageResult = await rawRequest(
    `/reset-password?token=${encodeURIComponent(forgotPasswordResult.payload?.resetToken ?? '')}&email=${encodeURIComponent(session.email)}`
  );
  assert.equal(resetPageResult.response.status, 200);
  assert.match(resetPageResult.response.headers.get('content-type') ?? '', /text\/html/i);
  assert.match(resetPageResult.body.toString('utf8'), /Reinitialiser votre mot de passe/i);

  const resetPageSubmitResult = await formRequest('/reset-password', {
    token: forgotPasswordResult.payload?.resetToken ?? '',
    newPassword: 'Garage456!',
    confirmPassword: 'Garage456!'
  });
  assert.equal(resetPageSubmitResult.response.status, 200);
  assert.match(resetPageSubmitResult.text, /Mot de passe reinitialise avec succes/i);

  const loginAfterWebResetResult = await apiRequest<{
    accessToken: string;
    user: { email: string };
  }>('/api/auth/login', {
    method: 'POST',
    body: {
      email: session.email,
      password: 'Garage456!'
    }
  });

  assert.equal(loginAfterWebResetResult.response.status, 200);
  assert.equal(loginAfterWebResetResult.payload?.user.email, session.email);

  const secondForgotPasswordResult = await apiRequest<{
    message: string;
    resetToken?: string;
    resetCode?: string;
  }>('/api/auth/forgot-password', {
    method: 'POST',
    body: {
      email: session.email
    }
  });

  assert.equal(secondForgotPasswordResult.response.status, 200);
  assert.ok(secondForgotPasswordResult.payload?.resetCode);
  const resetPasswordResult = await apiRequest<{
    accessToken: string;
    refreshToken: string;
    user: { email: string };
    message: string;
  }>('/api/auth/reset-password', {
    method: 'POST',
    body: {
      email: session.email,
      code: secondForgotPasswordResult.payload?.resetCode,
      newPassword: 'Garage789!'
    }
  });

  assert.equal(resetPasswordResult.response.status, 200);
  assert.equal(resetPasswordResult.payload?.user.email, session.email);
  assert.match(resetPasswordResult.payload?.message ?? '', /reinitialise/i);

  const loginAfterResetResult = await apiRequest<{
    accessToken: string;
    user: { email: string };
  }>('/api/auth/login', {
    method: 'POST',
    body: {
      email: session.email,
      password: 'Garage789!'
    }
  });

  assert.equal(loginAfterResetResult.response.status, 200);
  assert.equal(loginAfterResetResult.payload?.user.email, session.email);
});

runIntegrationTest('auth endpoints reject invalid credentials and duplicate accounts', async () => {
  const session = await registerUser();

  const duplicateRegisterResult = await apiRequest<{ message: string }>('/api/auth/register', {
    method: 'POST',
    body: {
      fullName: 'Integration User',
      email: session.email,
      phone: '+1 514 555 9999',
      password: 'Garage123!'
    }
  });
  assert.equal(duplicateRegisterResult.response.status, 409);
  assert.match(duplicateRegisterResult.payload?.message ?? '', /existe deja/i);

  const weakPasswordResult = await apiRequest<{ message: string }>('/api/auth/register', {
    method: 'POST',
    body: {
      fullName: 'Weak Password',
      email: `weak-${randomBytes(4).toString('hex')}@example.com`,
      password: '1234567',
      phone: '+1 514 555 1212'
    }
  });
  assert.equal(weakPasswordResult.response.status, 400);
  assert.match(weakPasswordResult.payload?.message ?? '', /8 caracteres/i);

  const wrongPasswordLoginResult = await apiRequest<{ message: string }>('/api/auth/login', {
    method: 'POST',
    body: {
      email: session.email,
      password: 'WrongPassword!'
    }
  });
  assert.equal(wrongPasswordLoginResult.response.status, 401);
  assert.match(wrongPasswordLoginResult.payload?.message ?? '', /invalide/i);

  const invalidRefreshResult = await apiRequest<{ message: string }>('/api/auth/refresh', {
    method: 'POST',
    body: {
      refreshToken: 'invalid-token'
    }
  });
  assert.equal(invalidRefreshResult.response.status, 401);
  assert.match(invalidRefreshResult.payload?.message ?? '', /jeton/i);

  const invalidForgotPasswordResult = await apiRequest<{ message: string }>('/api/auth/forgot-password', {
    method: 'POST',
    body: {
      email: 'not-an-email'
    }
  });
  assert.equal(invalidForgotPasswordResult.response.status, 400);
  assert.match(invalidForgotPasswordResult.payload?.message ?? '', /email invalide/i);

  const invalidResetPasswordResult = await apiRequest<{ message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: {
      token: 'invalid-token',
      newPassword: 'Garage789!'
    }
  });
  assert.equal(invalidResetPasswordResult.response.status, 401);
  assert.match(invalidResetPasswordResult.payload?.message ?? '', /jeton/i);
});

runIntegrationTest('admin web and admin APIs are protected and allow service and tutorial management', async () => {
  const standardUserSession = await registerUser();
  const forbiddenSummaryResult = await apiRequest<{ message: string }>('/api/admin/summary', {
    token: standardUserSession.accessToken
  });
  assert.equal(forbiddenSummaryResult.response.status, 403);
  assert.match(forbiddenSummaryResult.payload?.message ?? '', /Acces refuse/i);

  const adminSession = await createAdminSession();

  const summaryResult = await apiRequest<{
    metrics: { totalUsers: number; totalReservations: number; activeServices: number };
    recentReservations: unknown[];
  }>('/api/admin/summary', {
    token: adminSession.accessToken
  });
  assert.equal(summaryResult.response.status, 200);
  assert.ok((summaryResult.payload?.metrics.totalUsers ?? 0) >= 2);
  assert.ok((summaryResult.payload?.metrics.activeServices ?? 0) >= 4);
  assert.ok(Array.isArray(summaryResult.payload?.recentReservations));

  const usersResult = await apiRequest<Array<{ email: string; role: string }>>('/api/admin/users', {
    token: adminSession.accessToken
  });
  assert.equal(usersResult.response.status, 200);
  assert.ok(usersResult.payload?.some(user => user.email === adminSession.email && user.role === 'ADMIN'));

  const initialServicesResult = await apiRequest<Array<{ id: string; label: string }>>('/api/admin/services', {
    token: adminSession.accessToken
  });
  assert.equal(initialServicesResult.response.status, 200);
  assert.ok(initialServicesResult.payload?.some(service => service.id === 'oil-change'));

  const createdServiceResult = await apiRequest<{
    id: string;
    label: string;
    slotTimes: string[];
    price: number;
  }>('/api/admin/services', {
    method: 'POST',
    token: adminSession.accessToken,
    body: {
      label: 'Entretien climatisation',
      description: 'Nettoyage et verification du circuit de climatisation',
      durationMinutes: 50,
      price: 119.99,
      slotTimes: ['09:15', '14:45']
    }
  });
  assert.equal(createdServiceResult.response.status, 201);
  assert.equal(createdServiceResult.payload?.id, 'entretien-climatisation');
  assert.deepEqual(createdServiceResult.payload?.slotTimes, ['09:15', '14:45']);

  const duplicateServiceResult = await apiRequest<{ message: string }>('/api/admin/services', {
    method: 'POST',
    token: adminSession.accessToken,
    body: {
      label: 'Entretien climatisation',
      description: 'Doublon volontaire',
      durationMinutes: 40,
      price: 99.99,
      slotTimes: ['10:00', '15:00']
    }
  });
  assert.equal(duplicateServiceResult.response.status, 409);
  assert.match(duplicateServiceResult.payload?.message ?? '', /existe deja/i);

  const invalidServiceResult = await apiRequest<{ message: string }>('/api/admin/services', {
    method: 'POST',
    token: adminSession.accessToken,
    body: {
      label: 'A',
      durationMinutes: 0,
      price: 0,
      slotTimes: []
    }
  });
  assert.equal(invalidServiceResult.response.status, 400);
  assert.match(invalidServiceResult.payload?.message ?? '', /libelle|duree|prix|horaire/i);

  const reservationServicesResult = await apiRequest<Array<{ id: string; label: string }>>(
    '/api/reservations/services'
  );
  assert.equal(reservationServicesResult.response.status, 200);
  assert.ok(
    reservationServicesResult.payload?.some(
      service => service.id === 'entretien-climatisation' && service.label === 'Entretien climatisation'
    )
  );

  const slotsResult = await apiRequest<string[]>(
    '/api/reservations/slots?serviceId=entretien-climatisation&date=2026-05-01'
  );
  assert.equal(slotsResult.response.status, 200);
  assert.deepEqual(slotsResult.payload, ['09:15', '14:45']);

  const reservationsResult = await apiRequest<Array<{ id: string; serviceId: string; serviceLabel: string }>>(
    '/api/admin/reservations',
    {
      token: adminSession.accessToken
    }
  );
  assert.equal(reservationsResult.response.status, 200);
  assert.ok(Array.isArray(reservationsResult.payload));

  const createdTutorialResult = await apiRequest<{
    id: string;
    title: string;
    category: string;
    difficulty: string;
    videoUrl: string;
  }>('/api/tutorials', {
    method: 'POST',
    token: adminSession.accessToken,
    body: {
      title: 'Verifier la batterie',
      description: 'Tutoriel admin pour la console web',
      category: 'batterie',
      difficulty: 'facile',
      duration: 12,
      thumbnail: 'https://example.com/battery.png',
      videoUrl: 'https://example.com/battery.mp4',
      instructions: ['Couper le moteur', 'Verifier la tension'],
      tools: ['Multimetre']
    }
  });
  assert.equal(createdTutorialResult.response.status, 201);
  assert.equal(createdTutorialResult.payload?.title, 'Verifier la batterie');

  const listTutorialsResult = await apiRequest<Array<{ id: string; title: string }>>('/api/tutorials');
  assert.equal(listTutorialsResult.response.status, 200);
  assert.ok(
    listTutorialsResult.payload?.some(item => item.id === createdTutorialResult.payload?.id)
  );
});

runIntegrationTest('public profile and billing endpoints expose demo account data', async () => {
  const profileResult = await apiRequest<{
    fullName: string;
    email: string;
    appointmentCount: number;
    vehicleCount: number;
  }>('/api/profile');
  assert.equal(profileResult.response.status, 200);
  assert.equal(profileResult.payload?.fullName, 'Alex Martin');
  assert.equal(profileResult.payload?.email, 'alex.martin@example.com');
  assert.ok((profileResult.payload?.appointmentCount ?? 0) >= 2);

  const paymentMethodResult = await apiRequest<{
    provider: string;
    status: string;
    card: unknown;
  }>('/api/profile/payment-method');
  assert.equal(paymentMethodResult.response.status, 200);
  assert.equal(paymentMethodResult.payload?.provider, 'stripe');
  assert.equal(paymentMethodResult.payload?.card, null);

  const invoicesResult = await apiRequest<Array<{ id: string; serviceLabel: string }>>(
    '/api/profile/invoices'
  );
  assert.equal(invoicesResult.response.status, 200);
  assert.ok((invoicesResult.payload?.length ?? 0) >= 2);

  const pdfResult = await rawRequest(`/api/profile/invoices/${invoicesResult.payload?.[0]?.id}/pdf`);
  assert.equal(pdfResult.response.status, 200);
  assert.match(pdfResult.response.headers.get('content-type') ?? '', /application\/pdf/i);
  assert.ok(pdfResult.body.length > 0);
});

runIntegrationTest('authenticated user can create reservations and reviews through HTTP', async () => {
  const session = await registerUser();

  const createVehicleResult = await createVehicle(session.accessToken);
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

runIntegrationTest('reservation, review and vehicle endpoints reject invalid requests with stable errors', async () => {
  const session = await registerUser();

  const missingSlotsQueryResult = await apiRequest<{ message: string }>('/api/reservations/slots');
  assert.equal(missingSlotsQueryResult.response.status, 400);
  assert.match(missingSlotsQueryResult.payload?.message ?? '', /serviceId and date/i);

  const vehicleResult = await createVehicle(session.accessToken, {
    name: 'Toyota Yaris',
    model: 'Yaris 2020',
    year: '2020',
    mileage: '120000',
    type: 'truck',
    licensePlate: 'QC-111'
  });
  assert.equal(vehicleResult.response.status, 201);
  assert.equal(vehicleResult.payload?.type, 'truck');

  const missingInsuranceResult = await apiRequest<{ message: string }>(
    `/api/vehicles/${vehicleResult.payload?.id}/insurance`,
    {
      token: session.accessToken
    }
  );
  assert.equal(missingInsuranceResult.response.status, 404);
  assert.equal(missingInsuranceResult.payload?.message, 'Insurance not found');

  const createReservationMissingFieldsResult = await apiRequest<{ message: string }>(
    '/api/reservations',
    {
      method: 'POST',
      token: session.accessToken,
      body: {
        serviceId: 'oil-change'
      }
    }
  );
  assert.equal(createReservationMissingFieldsResult.response.status, 400);

  const createReservationUnknownServiceResult = await apiRequest<{ message: string }>(
    '/api/reservations',
    {
      method: 'POST',
      token: session.accessToken,
      body: {
        serviceId: 'engine-swap',
        date: '2026-04-16',
        time: '08:30'
      }
    }
  );
  assert.equal(createReservationUnknownServiceResult.response.status, 404);

  const createReservationUnknownVehicleResult = await apiRequest<{ message: string }>(
    '/api/reservations',
    {
      method: 'POST',
      token: session.accessToken,
      body: {
        serviceId: 'oil-change',
        vehicleId: 'missing-vehicle',
        date: '2026-04-16',
        time: '08:30'
      }
    }
  );
  assert.equal(createReservationUnknownVehicleResult.response.status, 404);

  const firstReservationResult = await apiRequest<{ id: string }>('/api/reservations', {
    method: 'POST',
    token: session.accessToken,
    body: {
      serviceId: 'oil-change',
      vehicleId: vehicleResult.payload?.id,
      date: '2026-04-16',
      time: '08:30',
      notes: 'Premier rendez-vous'
    }
  });
  assert.equal(firstReservationResult.response.status, 201);

  const secondReservationResult = await apiRequest<{ id: string }>('/api/reservations', {
    method: 'POST',
    token: session.accessToken,
    body: {
      serviceId: 'oil-change',
      vehicleId: vehicleResult.payload?.id,
      date: '2026-04-16',
      time: '10:00',
      notes: 'Deuxieme rendez-vous'
    }
  });
  assert.equal(secondReservationResult.response.status, 201);

  const conflictingReservationResult = await apiRequest<{ message: string }>('/api/reservations', {
    method: 'POST',
    token: session.accessToken,
    body: {
      serviceId: 'oil-change',
      vehicleId: vehicleResult.payload?.id,
      date: '2026-04-16',
      time: '08:30',
      notes: 'Conflit de plage'
    }
  });
  assert.equal(conflictingReservationResult.response.status, 409);

  const getReservationResult = await apiRequest<{ id: string; vehicleId?: string }>(
    `/api/reservations/${firstReservationResult.payload?.id}`,
    {
      token: session.accessToken
    }
  );
  assert.equal(getReservationResult.response.status, 200);
  assert.equal(getReservationResult.payload?.id, firstReservationResult.payload?.id);
  assert.equal(getReservationResult.payload?.vehicleId, vehicleResult.payload?.id);

  const missingReservationResult = await apiRequest<{ message: string }>('/api/reservations/missing-id', {
    token: session.accessToken
  });
  assert.equal(missingReservationResult.response.status, 404);

  const missingReservationUpdateResult = await apiRequest<{ message: string }>(
    '/api/reservations/missing-id',
    {
      method: 'PATCH',
      token: session.accessToken,
      body: {
        time: '13:30'
      }
    }
  );
  assert.equal(missingReservationUpdateResult.response.status, 404);

  const invalidServiceUpdateResult = await apiRequest<{ message: string }>(
    `/api/reservations/${firstReservationResult.payload?.id}`,
    {
      method: 'PATCH',
      token: session.accessToken,
      body: {
        serviceId: 'engine-swap'
      }
    }
  );
  assert.equal(invalidServiceUpdateResult.response.status, 404);

  const invalidVehicleUpdateResult = await apiRequest<{ message: string }>(
    `/api/reservations/${firstReservationResult.payload?.id}`,
    {
      method: 'PATCH',
      token: session.accessToken,
      body: {
        vehicleId: 'missing-vehicle'
      }
    }
  );
  assert.equal(invalidVehicleUpdateResult.response.status, 404);

  const conflictingUpdateResult = await apiRequest<{ message: string }>(
    `/api/reservations/${secondReservationResult.payload?.id}`,
    {
      method: 'PATCH',
      token: session.accessToken,
      body: {
        date: '2026-04-16',
        time: '08:30'
      }
    }
  );
  assert.equal(conflictingUpdateResult.response.status, 409);

  const invalidReviewPayloadResult = await apiRequest<{ message: string }>('/api/reviews', {
    method: 'POST',
    token: session.accessToken,
    body: {
      reservationId: firstReservationResult.payload?.id,
      comment: 'Sans note'
    }
  });
  assert.equal(invalidReviewPayloadResult.response.status, 400);

  const missingReviewReservationResult = await apiRequest<{ message: string }>('/api/reviews', {
    method: 'POST',
    token: session.accessToken,
    body: {
      reservationId: 'missing-reservation',
      rating: 4
    }
  });
  assert.equal(missingReviewReservationResult.response.status, 404);

  const createReviewResult = await apiRequest<{ rating: number; comment: string | null }>('/api/reviews', {
    method: 'POST',
    token: session.accessToken,
    body: {
      reservationId: firstReservationResult.payload?.id,
      rating: 4,
      comment: 'Premier avis'
    }
  });
  assert.equal(createReviewResult.response.status, 201);
  assert.equal(createReviewResult.payload?.rating, 4);

  const updateReviewResult = await apiRequest<{ rating: number; comment: string | null }>('/api/reviews', {
    method: 'POST',
    token: session.accessToken,
    body: {
      reservationId: firstReservationResult.payload?.id,
      rating: 5,
      comment: 'Avis mis a jour'
    }
  });
  assert.equal(updateReviewResult.response.status, 200);
  assert.equal(updateReviewResult.payload?.rating, 5);
  assert.equal(updateReviewResult.payload?.comment, 'Avis mis a jour');

  const uploadPhotoPlaceholderResult = await apiRequest<{ message: string }>(
    `/api/reservations/${firstReservationResult.payload?.id}/photos`,
    {
      method: 'POST',
      token: session.accessToken
    }
  );
  assert.equal(uploadPhotoPlaceholderResult.response.status, 501);
  assert.equal(uploadPhotoPlaceholderResult.payload?.message, 'reservations.uploadPhoto not implemented');

  const payPlaceholderResult = await apiRequest<{ message: string }>(
    `/api/reservations/${firstReservationResult.payload?.id}/pay`,
    {
      method: 'POST',
      token: session.accessToken
    }
  );
  assert.equal(payPlaceholderResult.response.status, 501);
  assert.equal(payPlaceholderResult.payload?.message, 'reservations.pay not implemented');

  const missingVehicleUpdateResult = await apiRequest<{ message: string }>('/api/vehicles/missing-id', {
    method: 'PUT',
    token: session.accessToken,
    body: {
      name: 'Missing',
      model: 'Missing',
      year: 2026,
      mileage: 0,
      type: 'sedan'
    }
  });
  assert.equal(missingVehicleUpdateResult.response.status, 404);

  const missingVehicleDeleteResult = await apiRequest<{ message: string }>('/api/vehicles/missing-id', {
    method: 'DELETE',
    token: session.accessToken
  });
  assert.equal(missingVehicleDeleteResult.response.status, 404);
});

runIntegrationTest('authenticated user can access vehicles, notifications, tutorials and payment summaries through HTTP', async () => {
  const session = await registerUser();

  const initialNotificationsResult = await apiRequest<
    Array<{ id: string; title: string; message: string; type: string }>
  >('/api/notifications', {
    token: session.accessToken
  });
  assert.equal(initialNotificationsResult.response.status, 200);
  assert.ok(initialNotificationsResult.payload?.some(item => item.id === 'vehicle-missing'));

  const initialHomeResult = await apiRequest<{
    displayName: string;
    nextAppointmentLabel: string;
    reminderMessage: string;
  }>('/api/home', {
    token: session.accessToken
  });
  assert.equal(initialHomeResult.response.status, 200);
  assert.equal(initialHomeResult.payload?.displayName, 'Integration');
  assert.match(initialHomeResult.payload?.nextAppointmentLabel ?? '', /Aucun rendez-vous/i);

  const firstVehicleResult = await createVehicle(session.accessToken, {
    name: 'Honda Civic',
    model: 'Civic 2021',
    year: 2021,
    mileage: 32000,
    licensePlate: 'QC-001'
  });
  assert.equal(firstVehicleResult.response.status, 201);
  assert.ok(firstVehicleResult.payload?.id);

  const homeWithVehicleOnlyResult = await apiRequest<{
    reminderMessage: string;
    nextAppointmentLabel: string;
  }>('/api/home', {
    token: session.accessToken
  });
  assert.equal(homeWithVehicleOnlyResult.response.status, 200);
  assert.match(homeWithVehicleOnlyResult.payload?.reminderMessage ?? '', /entretien|km/i);
  assert.match(homeWithVehicleOnlyResult.payload?.nextAppointmentLabel ?? '', /Aucun rendez-vous/i);

  await prismaClient.maintenanceRecord.create({
    data: {
      vehicleId: firstVehicleResult.payload!.id,
      type: 'oil_change',
      description: 'Vidange annuelle',
      mileage: 30000,
      cost: 89.9,
      date: new Date('2026-03-01T10:00:00.000Z')
    }
  });

  await prismaClient.vehicleDocument.create({
    data: {
      vehicleId: firstVehicleResult.payload!.id,
      type: 'registration',
      title: 'Carte grise',
      fileUrl: 'https://example.com/registration.pdf'
    }
  });

  await prismaClient.vehicleInsurance.create({
    data: {
      vehicleId: firstVehicleResult.payload!.id,
      provider: 'Desjardins',
      policyNumber: 'POL-12345',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2027-01-01T00:00:00.000Z'),
      coverage: 'Complete'
    }
  });

  await prismaClient.reminder.create({
    data: {
      vehicleId: firstVehicleResult.payload!.id,
      title: 'Controle pression pneus',
      dueAt: new Date('2026-04-10T09:00:00.000Z')
    }
  });

  const listVehiclesResult = await apiRequest<Array<{ id: string; name: string; model: string }>>(
    '/api/vehicles',
    {
      token: session.accessToken
    }
  );
  assert.equal(listVehiclesResult.response.status, 200);
  assert.equal(listVehiclesResult.payload?.length, 1);
  assert.equal(listVehiclesResult.payload?.[0]?.id, firstVehicleResult.payload?.id);

  const getVehicleResult = await apiRequest<{ id: string; name: string; licensePlate: string | null }>(
    `/api/vehicles/${firstVehicleResult.payload?.id}`,
    {
      token: session.accessToken
    }
  );
  assert.equal(getVehicleResult.response.status, 200);
  assert.equal(getVehicleResult.payload?.name, 'Honda Civic');
  assert.equal(getVehicleResult.payload?.licensePlate, 'QC-001');

  const maintenanceResult = await apiRequest<Array<{ description: string }>>(
    `/api/vehicles/${firstVehicleResult.payload?.id}/maintenance`,
    {
      token: session.accessToken
    }
  );
  assert.equal(maintenanceResult.response.status, 200);
  assert.equal(maintenanceResult.payload?.length, 1);
  assert.equal(maintenanceResult.payload?.[0]?.description, 'Vidange annuelle');

  const documentsResult = await apiRequest<Array<{ title: string }>>(
    `/api/vehicles/${firstVehicleResult.payload?.id}/documents`,
    {
      token: session.accessToken
    }
  );
  assert.equal(documentsResult.response.status, 200);
  assert.equal(documentsResult.payload?.length, 1);
  assert.equal(documentsResult.payload?.[0]?.title, 'Carte grise');

  const insuranceResult = await apiRequest<{ provider: string; policyNumber: string }>(
    `/api/vehicles/${firstVehicleResult.payload?.id}/insurance`,
    {
      token: session.accessToken
    }
  );
  assert.equal(insuranceResult.response.status, 200);
  assert.equal(insuranceResult.payload?.provider, 'Desjardins');
  assert.equal(insuranceResult.payload?.policyNumber, 'POL-12345');

  const updateVehicleResult = await apiRequest<{ id: string; model: string; licensePlate: string | null }>(
    `/api/vehicles/${firstVehicleResult.payload?.id}`,
    {
      method: 'PUT',
      token: session.accessToken,
      body: {
        name: 'Honda Civic',
        model: 'Civic Touring',
        year: 2021,
        mileage: 33500,
        type: 'sedan',
        licensePlate: 'QC-002',
        fuelType: 'Essence'
      }
    }
  );
  assert.equal(updateVehicleResult.response.status, 200);
  assert.equal(updateVehicleResult.payload?.model, 'Civic Touring');
  assert.equal(updateVehicleResult.payload?.licensePlate, 'QC-002');

  const reservationResult = await apiRequest<{ id: string; serviceId: string }>(
    '/api/reservations',
    {
      method: 'POST',
      token: session.accessToken,
      body: {
        serviceId: 'brakes',
        vehicleId: firstVehicleResult.payload?.id,
        date: '2026-04-18',
        time: '11:30',
        notes: 'Reservation pour notifications'
      }
    }
  );
  assert.equal(reservationResult.response.status, 201);
  assert.equal(reservationResult.payload?.serviceId, 'brakes');

  const enrichedHomeResult = await apiRequest<{
    displayName: string;
    nextAppointmentLabel: string;
    reminderMessage: string;
  }>('/api/home', {
    token: session.accessToken
  });
  assert.equal(enrichedHomeResult.response.status, 200);
  assert.match(enrichedHomeResult.payload?.nextAppointmentLabel ?? '', /Freins|Brakes/i);
  assert.match(enrichedHomeResult.payload?.reminderMessage ?? '', /pression pneus/i);

  const enrichedNotificationsResult = await apiRequest<
    Array<{ title: string; type: string; dateContext: { kind: string } | null }>
  >('/api/notifications', {
    token: session.accessToken
  });
  assert.equal(enrichedNotificationsResult.response.status, 200);
  assert.ok(enrichedNotificationsResult.payload?.some(item => item.title === 'Prochain rendez-vous'));
  assert.ok(enrichedNotificationsResult.payload?.some(item => item.title === 'Activite recente'));
  assert.ok(
    enrichedNotificationsResult.payload?.some(
      item => item.dateContext?.kind === 'reminder' || item.title.includes('pression pneus')
    )
  );

  const secondVehicleResult = await createVehicle(session.accessToken, {
    name: 'Mazda 3',
    model: 'Mazda 3 2019',
    year: 2019,
    mileage: 54000,
    licensePlate: 'QC-003'
  });
  assert.equal(secondVehicleResult.response.status, 201);

  const deleteVehicleResult = await apiRequest<null>(`/api/vehicles/${secondVehicleResult.payload?.id}`, {
    method: 'DELETE',
    token: session.accessToken
  });
  assert.equal(deleteVehicleResult.response.status, 204);

  const missingVehicleResult = await apiRequest<{ message: string }>(
    `/api/vehicles/${secondVehicleResult.payload?.id}`,
    {
      token: session.accessToken
    }
  );
  assert.equal(missingVehicleResult.response.status, 404);

  const adminSession = await createAdminSession();

  const forbiddenTutorialCreateResult = await apiRequest<{ message: string }>('/api/tutorials', {
    method: 'POST',
    token: session.accessToken,
    body: {
      title: 'Creation interdite',
      description: 'Un client ne doit pas ajouter de tutoriel',
      category: 'batterie',
      difficulty: 'facile',
      duration: 12,
      thumbnail: 'https://example.com/battery.png',
      videoUrl: 'https://example.com/battery.mp4',
      instructions: ['Instruction'],
      tools: ['Multimetre']
    }
  });
  assert.equal(forbiddenTutorialCreateResult.response.status, 403);

  const createTutorialResult = await apiRequest<{
    id: string;
    title: string;
    category: string;
    difficulty: string;
    views: number;
    rating: number;
  }>('/api/tutorials', {
    method: 'POST',
    token: adminSession.accessToken,
    body: {
      title: 'Verifier la batterie',
      description: 'Tutoriel de verification de batterie',
      category: 'batterie',
      difficulty: 'facile',
      duration: 12,
      thumbnail: 'https://example.com/battery.png',
      videoUrl: 'https://example.com/battery.mp4',
      instructions: ['Couper le moteur', 'Verifier la tension'],
      tools: ['Multimetre'],
      views: 4,
      rating: 3.5
    }
  });
  assert.equal(createTutorialResult.response.status, 201);
  assert.equal(createTutorialResult.payload?.title, 'Verifier la batterie');
  assert.equal(createTutorialResult.payload?.category, 'batterie');
  assert.equal(createTutorialResult.payload?.difficulty, 'facile');

  const listTutorialsResult = await apiRequest<Array<{ id: string }>>('/api/tutorials');
  assert.equal(listTutorialsResult.response.status, 200);
  assert.ok(listTutorialsResult.payload?.some(item => item.id === createTutorialResult.payload?.id));

  const popularTutorialsResult = await apiRequest<Array<{ id: string }>>('/api/tutorials/popular?limit=1');
  assert.equal(popularTutorialsResult.response.status, 200);
  assert.equal(popularTutorialsResult.payload?.length, 1);

  const topRatedTutorialsResult = await apiRequest<Array<{ id: string }>>('/api/tutorials/top-rated?limit=1');
  assert.equal(topRatedTutorialsResult.response.status, 200);
  assert.equal(topRatedTutorialsResult.payload?.length, 1);

  const tutorialsByCategoryResult = await apiRequest<Array<{ id: string; category: string }>>(
    '/api/tutorials/category/battery'
  );
  assert.equal(tutorialsByCategoryResult.response.status, 200);
  assert.ok(
    tutorialsByCategoryResult.payload?.some(item => item.id === createTutorialResult.payload?.id)
  );

  const tutorialByIdResult = await apiRequest<{ id: string; title: string }>(
    `/api/tutorials/${createTutorialResult.payload?.id}`
  );
  assert.equal(tutorialByIdResult.response.status, 200);
  assert.equal(tutorialByIdResult.payload?.id, createTutorialResult.payload?.id);

  const incrementViewsResult = await apiRequest<null>(
    `/api/tutorials/${createTutorialResult.payload?.id}/views`,
    {
      method: 'POST'
    }
  );
  assert.equal(incrementViewsResult.response.status, 204);

  const rateTutorialResult = await apiRequest<{ id: string; rating: number }>(
    `/api/tutorials/${createTutorialResult.payload?.id}/rate`,
    {
      method: 'POST',
      body: {
        rating: 4.8
      }
    }
  );
  assert.equal(rateTutorialResult.response.status, 200);
  assert.equal(rateTutorialResult.payload?.rating, 4.8);

  const updateTutorialResult = await apiRequest<{ id: string; title: string; difficulty: string }>(
    `/api/tutorials/${createTutorialResult.payload?.id}`,
    {
      method: 'PUT',
      token: adminSession.accessToken,
      body: {
        title: 'Verifier la batterie 12V',
        description: 'Tutoriel mis a jour',
        category: 'batterie',
        difficulty: 'difficile',
        duration: 14,
        thumbnail: 'https://example.com/battery.png',
        videoUrl: 'https://example.com/battery-updated.mp4',
        instructions: ['Tester la batterie', 'Verifier les bornes'],
        tools: ['Multimetre', 'Gants'],
        rating: 4.9
      }
    }
  );
  assert.equal(updateTutorialResult.response.status, 200);
  assert.equal(updateTutorialResult.payload?.title, 'Verifier la batterie 12V');
  assert.equal(updateTutorialResult.payload?.difficulty, 'difficile');

  const missingTutorialResult = await apiRequest<{ message: string }>('/api/tutorials/missing-id');
  assert.equal(missingTutorialResult.response.status, 404);

  const forbiddenTutorialUpdateResult = await apiRequest<{ message: string }>(
    `/api/tutorials/${createTutorialResult.payload?.id}`,
    {
      method: 'PUT',
      token: session.accessToken,
      body: {
        title: 'Client interdit',
        description: 'Tentative interdite',
        category: 'batterie',
        difficulty: 'facile',
        duration: 10,
        thumbnail: 'https://example.com/missing.png',
        videoUrl: 'https://example.com/missing.mp4',
        instructions: [],
        tools: []
      }
    }
  );
  assert.equal(forbiddenTutorialUpdateResult.response.status, 403);

  const missingTutorialViewResult = await apiRequest<null>('/api/tutorials/missing-id/views', {
    method: 'POST'
  });
  assert.equal(missingTutorialViewResult.response.status, 204);

  const invalidTutorialCreateResult = await apiRequest<{ message: string }>('/api/tutorials', {
    method: 'POST',
    token: adminSession.accessToken,
    body: {
      title: null
    }
  });
  assert.equal(invalidTutorialCreateResult.response.status, 503);

  const missingTutorialRateResult = await apiRequest<{ message: string }>('/api/tutorials/missing-id/rate', {
    method: 'POST',
    body: {
      rating: 4
    }
  });
  assert.equal(missingTutorialRateResult.response.status, 503);

  const missingTutorialUpdateResult = await apiRequest<{ message: string }>('/api/tutorials/missing-id', {
    method: 'PUT',
    token: adminSession.accessToken,
    body: {
      title: 'Missing tutorial',
      description: 'Missing tutorial update',
      category: 'batterie',
      difficulty: 'facile',
      duration: 10,
      thumbnail: 'https://example.com/missing.png',
      videoUrl: 'https://example.com/missing.mp4',
      instructions: [],
      tools: []
    }
  });
  assert.equal(missingTutorialUpdateResult.response.status, 503);

  const paymentSummaryResult = await apiRequest<{
    status: string;
    backendReachable: boolean;
    provider: string;
  }>('/api/profile/payment-method', {
    token: session.accessToken
  });
  assert.equal(paymentSummaryResult.response.status, 200);
  assert.equal(paymentSummaryResult.payload?.provider, 'stripe');
  assert.equal(paymentSummaryResult.payload?.backendReachable, true);

  const invoicesResult = await apiRequest<Array<{ id: string }>>('/api/profile/invoices', {
    token: session.accessToken
  });
  assert.equal(invoicesResult.response.status, 200);
  assert.ok((invoicesResult.payload?.length ?? 0) >= 1);

  const pdfResult = await rawRequest(
    `/api/profile/invoices/${invoicesResult.payload?.[0]?.id}/pdf`,
    {
      token: session.accessToken
    }
  );
  assert.equal(pdfResult.response.status, 200);
  assert.match(pdfResult.response.headers.get('content-type') ?? '', /application\/pdf/i);
  assert.ok(pdfResult.body.length > 0);

  const missingPdfResult = await apiRequest<{ message: string }>('/api/profile/invoices/missing/pdf', {
    token: session.accessToken
  });
  assert.equal(missingPdfResult.response.status, 404);

  const stripeConfigured = Boolean(process.env.STRIPE_KEY?.trim());
  const syncPaymentResult = await apiRequest<{ message?: string; status?: string }>(
    '/api/profile/payment-method/sync',
    {
      method: 'POST',
      token: session.accessToken,
      body: {}
    }
  );
  assert.equal(syncPaymentResult.response.status, stripeConfigured ? 400 : 503);

  const deleteTutorialResult = await apiRequest<null>(
    `/api/tutorials/${createTutorialResult.payload?.id}`,
    {
      method: 'DELETE',
      token: adminSession.accessToken
    }
  );
  assert.equal(deleteTutorialResult.response.status, 204);

  const forbiddenTutorialDeleteResult = await apiRequest<{ message: string }>(
    `/api/tutorials/${createTutorialResult.payload?.id}`,
    {
      method: 'DELETE',
      token: session.accessToken
    }
  );
  assert.equal(forbiddenTutorialDeleteResult.response.status, 403);

  const missingTutorialDeleteResult = await apiRequest<{ message: string }>('/api/tutorials/missing-id', {
    method: 'DELETE',
    token: adminSession.accessToken
  });
  assert.equal(missingTutorialDeleteResult.response.status, 503);
});
