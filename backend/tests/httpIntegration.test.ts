import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
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
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

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
    headers?: Record<string, string>;
  } = {}
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers ?? {})
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
    headers?: Record<string, string>;
  } = {}
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers ?? {})
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

async function multipartRequest<T = unknown>(
  path: string,
  formData: FormData,
  options: {
    method?: string;
    token?: string;
  } = {}
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'POST',
    headers: {
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {})
    },
    body: formData
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) as T : null;
  return { response, payload };
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
    userId: payload!.user.id,
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

async function createReservation(
  token: string,
  overrides: Record<string, unknown> = {}
) {
  return apiRequest<{
    id: string;
    serviceId: string;
    vehicleId?: string;
    date: string;
    time: string;
    status: string;
    notes?: string;
    message?: string;
  }>('/api/reservations', {
    method: 'POST',
    token,
    body: {
      serviceId: 'oil-change',
      date: '2026-04-16',
      time: '08:30',
      notes: 'Integration test reservation',
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
    membershipLabel: string;
    verified: boolean;
    memberSince: string;
    defaultVehicleLabel: string;
    appointmentCount: number;
    vehicleCount: number;
    loyaltyPoints: number;
  }>('/api/profile', {
    token: loginResult.payload?.accessToken
  });

  assert.equal(initialProfileResult.response.status, 200);
  assert.equal(initialProfileResult.payload?.email, session.email);
  assert.equal(initialProfileResult.payload?.membershipLabel, 'Client');
  assert.equal(initialProfileResult.payload?.verified, true);
  assert.match(initialProfileResult.payload?.memberSince ?? '', /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(initialProfileResult.payload?.defaultVehicleLabel, 'Aucun vehicule');
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
    membershipLabel: string;
    verified: boolean;
    memberSince: string;
    defaultVehicleLabel: string;
    loyaltyPoints: number;
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
  assert.equal(profileResult.payload?.membershipLabel, 'Client');
  assert.equal(profileResult.payload?.verified, true);
  assert.equal(profileResult.payload?.defaultVehicleLabel, 'Aucun vehicule');
  assert.equal(profileResult.payload?.loyaltyPoints, 0);

  const protectedProfileUpdateResult = await apiRequest<{
    notes: string;
    membershipLabel: string;
    verified: boolean;
    memberSince: string;
    defaultVehicleLabel: string;
    loyaltyPoints: number;
  }>('/api/profile', {
    method: 'PUT',
    token: loginResult.payload?.accessToken,
    body: {
      notes: 'Tentative de forcer des champs proteges.',
      membershipLabel: 'Administrateur',
      verified: false,
      memberSince: '2001-01-01',
      defaultVehicleLabel: 'Vehicule pirate',
      loyaltyPoints: 9999
    }
  });

  assert.equal(protectedProfileUpdateResult.response.status, 200);
  assert.equal(protectedProfileUpdateResult.payload?.notes, 'Tentative de forcer des champs proteges.');
  assert.equal(protectedProfileUpdateResult.payload?.membershipLabel, 'Client');
  assert.equal(protectedProfileUpdateResult.payload?.verified, true);
  assert.equal(protectedProfileUpdateResult.payload?.memberSince, profileResult.payload?.memberSince);
  assert.equal(protectedProfileUpdateResult.payload?.defaultVehicleLabel, 'Aucun vehicule');
  assert.equal(protectedProfileUpdateResult.payload?.loyaltyPoints, 0);

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

runIntegrationTest('profile update rejects an email already used by another user', async () => {
  const firstSession = await registerUser();
  const secondSession = await registerUser();

  const conflictingUpdateResult = await apiRequest<{ message: string }>('/api/profile', {
    method: 'PUT',
    token: secondSession.accessToken,
    body: {
      email: firstSession.email,
      fullName: 'Second User',
      phone: '+1 514 555 4444'
    }
  });

  assert.equal(conflictingUpdateResult.response.status, 409);
  assert.equal(conflictingUpdateResult.payload?.message, 'Impossible de mettre a jour ce profil.');

  const secondProfileResult = await apiRequest<{ email: string; fullName: string }>('/api/profile', {
    token: secondSession.accessToken
  });

  assert.equal(secondProfileResult.response.status, 200);
  assert.equal(secondProfileResult.payload?.email, secondSession.email);
  assert.equal(secondProfileResult.payload?.fullName, 'Integration User');
});

runIntegrationTest('public endpoints, password reset and placeholder routes expose stable responses', async () => {
  const rootResult = await apiRequest<{ ok: boolean; service: string }>('/');
  assert.equal(rootResult.response.status, 200);
  assert.equal(rootResult.payload?.ok, true);
  assert.equal(rootResult.payload?.service, 'garage-mechanic-backend');

  const healthResult = await apiRequest<{
    ok: boolean;
    status: 'ok' | 'degraded';
    service: string;
    environment: string;
    timestamp: string;
    checks: {
      app: {
        status: 'up';
      };
      db: {
        status: 'up' | 'down';
      };
    };
  }>('/health', {
    headers: {
      origin: 'http://localhost:8080'
    }
  });
  assert.equal(healthResult.response.status, 200);
  assert.equal(healthResult.payload?.ok, true);
  assert.equal(healthResult.payload?.status, 'ok');
  assert.equal(healthResult.payload?.service, 'garage-mechanic-backend');
  assert.match(healthResult.payload?.environment ?? '', /^(development|test|production)$/);
  assert.equal(Number.isNaN(Date.parse(healthResult.payload?.timestamp ?? '')), false);
  assert.equal(healthResult.payload?.checks.app.status, 'up');
  assert.equal(healthResult.payload?.checks.db.status, 'up');
  assert.ok(healthResult.response.headers.get('x-request-id'));
  assert.equal(healthResult.response.headers.get('access-control-allow-origin'), 'http://localhost:8080');
  assert.equal(healthResult.response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(healthResult.response.headers.get('x-frame-options'), 'SAMEORIGIN');

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

runIntegrationTest('security middleware rejects oversized JSON payloads with HTTP 413', async () => {
  const oversizedPayloadResult = await apiRequest<{ message: string }>('/api/auth/login', {
    method: 'POST',
    body: {
      email: `${'a'.repeat(1_100_000)}@example.com`,
      password: 'Garage123!'
    }
  });

  assert.equal(oversizedPayloadResult.response.status, 413);
  assert.ok(oversizedPayloadResult.payload?.message);
});
runIntegrationTest('home feed stays valid with an invalid optional auth token', async () => {
  const homeResult = await apiRequest<{
    displayName: string;
    nextAppointmentLabel: string;
    reminderMessage: string;
  }>('/api/home', {
    token: 'invalid-token'
  });

  assert.equal(homeResult.response.status, 200);
  assert.equal(homeResult.payload?.displayName, 'Alex');
  assert.match(homeResult.payload?.nextAppointmentLabel ?? '', /Aucun rendez-vous/i);
  assert.match(homeResult.payload?.reminderMessage ?? '', /Consultez vos vehicules/i);
});

runIntegrationTest('password reset avoids account enumeration and invalidates used reset codes', async () => {
  const session = await registerUser();
  const missingEmail = `missing-${randomBytes(4).toString('hex')}@example.com`;

  const unknownAccountForgotPasswordResult = await apiRequest<{
    message: string;
    resetToken?: string;
    resetCode?: string;
  }>('/api/auth/forgot-password', {
    method: 'POST',
    body: {
      email: missingEmail
    }
  });

  assert.equal(unknownAccountForgotPasswordResult.response.status, 200);
  assert.match(unknownAccountForgotPasswordResult.payload?.message ?? '', /si un compte existe/i);
  assert.equal(unknownAccountForgotPasswordResult.payload?.resetToken, undefined);
  assert.equal(unknownAccountForgotPasswordResult.payload?.resetCode, undefined);

  const forgotPasswordResult = await apiRequest<{
    message: string;
    resetCode?: string;
  }>('/api/auth/forgot-password', {
    method: 'POST',
    body: {
      email: session.email
    }
  });

  assert.equal(forgotPasswordResult.response.status, 200);
  assert.ok(forgotPasswordResult.payload?.resetCode);

  const firstResetResult = await apiRequest<{
    message: string;
    user: { email: string };
  }>('/api/auth/reset-password', {
    method: 'POST',
    body: {
      email: session.email,
      code: forgotPasswordResult.payload?.resetCode,
      newPassword: 'Garage999!'
    }
  });

  assert.equal(firstResetResult.response.status, 200);
  assert.equal(firstResetResult.payload?.user.email, session.email);
  assert.match(firstResetResult.payload?.message ?? '', /reinitialise/i);

  const reusedCodeResetResult = await apiRequest<{ message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: {
      email: session.email,
      code: forgotPasswordResult.payload?.resetCode,
      newPassword: 'Garage1000!'
    }
  });

  assert.equal(reusedCodeResetResult.response.status, 401);
  assert.match(reusedCodeResetResult.payload?.message ?? '', /code de reinitialisation invalide ou expire/i);
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

runIntegrationTest('admin can deactivate and reactivate accounts and disabled users lose access', async () => {
  const userSession = await registerUser();
  const adminSession = await createAdminSession();

  const initialUsersResult = await apiRequest<Array<{ id: string; email: string; active: boolean }>>('/api/admin/users', {
    token: adminSession.accessToken
  });
  assert.equal(initialUsersResult.response.status, 200);
  assert.ok(initialUsersResult.payload?.some(user => user.id === userSession.userId && user.active === true));

  const deactivateResult = await apiRequest<{ id: string; active: boolean }>(
    `/api/admin/users/${userSession.userId}/activation`,
    {
      method: 'PATCH',
      token: adminSession.accessToken,
      body: {
        active: false
      }
    }
  );
  assert.equal(deactivateResult.response.status, 200);
  assert.equal(deactivateResult.payload?.id, userSession.userId);
  assert.equal(deactivateResult.payload?.active, false);

  const disabledVehiclesResult = await apiRequest<{ message: string }>('/api/vehicles', {
    token: userSession.accessToken
  });
  assert.equal(disabledVehiclesResult.response.status, 403);
  assert.match(disabledVehiclesResult.payload?.message ?? '', /desactive/i);

  const disabledRefreshResult = await apiRequest<{ message: string }>('/api/auth/refresh', {
    method: 'POST',
    body: {
      refreshToken: userSession.refreshToken
    }
  });
  assert.equal(disabledRefreshResult.response.status, 403);
  assert.match(disabledRefreshResult.payload?.message ?? '', /desactive/i);

  const disabledLoginResult = await apiRequest<{ message: string }>('/api/auth/login', {
    method: 'POST',
    body: {
      email: userSession.email,
      password: userSession.password
    }
  });
  assert.equal(disabledLoginResult.response.status, 403);
  assert.match(disabledLoginResult.payload?.message ?? '', /desactive/i);

  const selfDeactivateResult = await apiRequest<{ message: string }>(
    `/api/admin/users/${adminSession.userId}/activation`,
    {
      method: 'PATCH',
      token: adminSession.accessToken,
      body: {
        active: false
      }
    }
  );
  assert.equal(selfDeactivateResult.response.status, 400);
  assert.match(selfDeactivateResult.payload?.message ?? '', /propre compte|dernier administrateur/i);

  const reactivateResult = await apiRequest<{ id: string; active: boolean }>(
    `/api/admin/users/${userSession.userId}/activation`,
    {
      method: 'PATCH',
      token: adminSession.accessToken,
      body: {
        active: true
      }
    }
  );
  assert.equal(reactivateResult.response.status, 200);
  assert.equal(reactivateResult.payload?.active, true);

  const reactivatedLoginResult = await apiRequest<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string };
  }>('/api/auth/login', {
    method: 'POST',
    body: {
      email: userSession.email,
      password: userSession.password
    }
  });
  assert.equal(reactivatedLoginResult.response.status, 200);
  assert.equal(reactivatedLoginResult.payload?.user.id, userSession.userId);

  const updatedUsersResult = await apiRequest<Array<{ id: string; email: string; active: boolean }>>('/api/admin/users', {
    token: adminSession.accessToken
  });
  assert.equal(updatedUsersResult.response.status, 200);
  assert.ok(updatedUsersResult.payload?.some(user => user.id === userSession.userId && user.active === true));
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

  const updatedServiceResult = await apiRequest<{
    id: string;
    label: string;
    slotTimes: string[];
    price: number;
    active: boolean;
  }>('/api/admin/services/entretien-climatisation', {
    method: 'PUT',
    token: adminSession.accessToken,
    body: {
      label: 'Climatisation premium',
      description: 'Service revise pour la haute saison',
      durationMinutes: 65,
      price: 139.99,
      slotTimes: ['08:45', '13:15', '17:30']
    }
  });
  assert.equal(updatedServiceResult.response.status, 200);
  assert.equal(updatedServiceResult.payload?.label, 'Climatisation premium');
  assert.equal(updatedServiceResult.payload?.price, 139.99);
  assert.deepEqual(updatedServiceResult.payload?.slotTimes, ['08:45', '13:15', '17:30']);

  const updatedReservationServicesResult = await apiRequest<Array<{ id: string; label: string }>>(
    '/api/reservations/services'
  );
  assert.equal(updatedReservationServicesResult.response.status, 200);
  assert.ok(
    updatedReservationServicesResult.payload?.some(
      service => service.id === 'entretien-climatisation' && service.label === 'Climatisation premium'
    )
  );

  const deletedServiceResult = await apiRequest<{ id: string; active: boolean }>(
    '/api/admin/services/entretien-climatisation',
    {
      method: 'DELETE',
      token: adminSession.accessToken
    }
  );
  assert.equal(deletedServiceResult.response.status, 200);
  assert.equal(deletedServiceResult.payload?.active, false);

  const reservationServicesAfterDeleteResult = await apiRequest<Array<{ id: string; label: string }>>(
    '/api/reservations/services'
  );
  assert.equal(reservationServicesAfterDeleteResult.response.status, 200);
  assert.ok(
    reservationServicesAfterDeleteResult.payload?.every(
      service => service.id !== 'entretien-climatisation'
    )
  );

  const reservationsResult = await apiRequest<Array<{ id: string; serviceId: string; serviceLabel: string }>>(
    '/api/admin/reservations',
    {
      token: adminSession.accessToken
    }
  );
  assert.equal(reservationsResult.response.status, 200);
  assert.ok(Array.isArray(reservationsResult.payload));

  const tutorialFormData = new FormData();
  tutorialFormData.set('title', 'Verifier la batterie');
  tutorialFormData.set('description', 'Tutoriel admin pour la console web');
  tutorialFormData.set('category', 'batterie');
  tutorialFormData.set('difficulty', 'facile');
  tutorialFormData.set('duration', '12');
  tutorialFormData.set('instructions', 'Couper le moteur\nVerifier la tension');
  tutorialFormData.set('tools', 'Multimetre');
  tutorialFormData.set('thumbnail', 'https://example.com/battery.png');
  tutorialFormData.set(
    'videoFile',
    new Blob(['fake-video-bytes'], { type: 'video/mp4' }),
    'battery.mp4'
  );

  const createdTutorialResult = await multipartRequest<{
    id: string;
    title: string;
    category: string;
    difficulty: string;
    videoUrl: string;
  }>('/api/admin/tutorials', tutorialFormData, {
    token: adminSession.accessToken
  });
  assert.equal(createdTutorialResult.response.status, 201);
  assert.equal(createdTutorialResult.payload?.title, 'Verifier la batterie');
  assert.match(createdTutorialResult.payload?.videoUrl ?? '', /\/uploads\/tutorials\//i);
  const createdTutorialVideoPathname = createdTutorialResult.payload?.videoUrl?.startsWith('http')
    ? new URL(createdTutorialResult.payload.videoUrl).pathname
    : createdTutorialResult.payload?.videoUrl ?? '';
  const createdTutorialVideoFilePath = resolve(
    backendDir,
    ...createdTutorialVideoPathname.replace(/^\/+/, '').split('/').filter(Boolean)
  );
  assert.equal(existsSync(createdTutorialVideoFilePath), true);

  const listTutorialsResult = await apiRequest<Array<{ id: string; title: string }>>('/api/admin/tutorials', {
    token: adminSession.accessToken
  });
  assert.equal(listTutorialsResult.response.status, 200);
  assert.ok(
    listTutorialsResult.payload?.some(item => item.id === createdTutorialResult.payload?.id)
  );

  const deleteTutorialResult = await apiRequest<null>(
    `/api/tutorials/${createdTutorialResult.payload?.id}`,
    {
      method: 'DELETE',
      token: adminSession.accessToken
    }
  );
  assert.equal(deleteTutorialResult.response.status, 204);
  assert.equal(existsSync(createdTutorialVideoFilePath), false);
});

runIntegrationTest('admin can list and delete harmful reviews through admin API', async () => {
  const userSession = await registerUser();
  const adminSession = await createAdminSession();

  const createVehicleResult = await createVehicle(userSession.accessToken, {
    licensePlate: 'REVIEW-101'
  });
  assert.equal(createVehicleResult.response.status, 201);

  const createReservationResult = await apiRequest<{
    id: string;
    serviceId: string;
    serviceLabel: string;
    status: string;
  }>('/api/reservations', {
    method: 'POST',
    token: userSession.accessToken,
    body: {
      serviceId: 'oil-change',
      vehicleId: createVehicleResult.payload?.id,
      date: '2026-05-02',
      time: '10:00',
      notes: 'Reservation pour moderation admin'
    }
  });
  assert.equal(createReservationResult.response.status, 201);

  const reviewCreateResult = await apiRequest<{
    id: string;
    reservationId: string;
    rating: number;
    comment: string | null;
  }>('/api/reviews', {
    method: 'POST',
    token: userSession.accessToken,
    body: {
      reservationId: createReservationResult.payload?.id,
      rating: 1,
      comment: 'Avis malsain de test a supprimer.'
    }
  });
  assert.equal(reviewCreateResult.response.status, 201);
  assert.ok(reviewCreateResult.payload?.id);

  const forbiddenReviewsResult = await apiRequest<{ message: string }>('/api/admin/reviews', {
    token: userSession.accessToken
  });
  assert.equal(forbiddenReviewsResult.response.status, 403);
  assert.match(forbiddenReviewsResult.payload?.message ?? '', /Acces refuse/i);

  const adminReviewsResult = await apiRequest<
    Array<{ id: string; customerEmail: string; comment: string | null }>
  >('/api/admin/reviews', {
    token: adminSession.accessToken
  });
  assert.equal(adminReviewsResult.response.status, 200);
  assert.ok(
    adminReviewsResult.payload?.some(
      review =>
        review.id === reviewCreateResult.payload?.id &&
        review.customerEmail === userSession.email &&
        review.comment === 'Avis malsain de test a supprimer.'
    )
  );

  const summaryBeforeDeleteResult = await apiRequest<{
    metrics: { totalReviews: number };
    recentReviews: Array<{ id: string }>;
  }>('/api/admin/summary', {
    token: adminSession.accessToken
  });
  assert.equal(summaryBeforeDeleteResult.response.status, 200);
  assert.ok(
    summaryBeforeDeleteResult.payload?.recentReviews.some(
      review => review.id === reviewCreateResult.payload?.id
    )
  );

  const totalReviewsBeforeDelete = summaryBeforeDeleteResult.payload?.metrics.totalReviews ?? 0;

  const forbiddenDeleteResult = await apiRequest<{ message: string }>(
    `/api/admin/reviews/${reviewCreateResult.payload?.id}`,
    {
      method: 'DELETE',
      token: userSession.accessToken
    }
  );
  assert.equal(forbiddenDeleteResult.response.status, 403);
  assert.match(forbiddenDeleteResult.payload?.message ?? '', /Acces refuse/i);

  const deleteReviewResult = await rawRequest(
    `/api/admin/reviews/${reviewCreateResult.payload?.id}`,
    {
      method: 'DELETE',
      token: adminSession.accessToken
    }
  );
  assert.equal(deleteReviewResult.response.status, 204);
  assert.equal(deleteReviewResult.body.length, 0);

  const adminReviewsAfterDeleteResult = await apiRequest<Array<{ id: string }>>(
    '/api/admin/reviews',
    {
      token: adminSession.accessToken
    }
  );
  assert.equal(adminReviewsAfterDeleteResult.response.status, 200);
  assert.ok(
    adminReviewsAfterDeleteResult.payload?.every(
      review => review.id !== reviewCreateResult.payload?.id
    )
  );

  const summaryAfterDeleteResult = await apiRequest<{
    metrics: { totalReviews: number };
    recentReviews: Array<{ id: string }>;
  }>('/api/admin/summary', {
    token: adminSession.accessToken
  });
  assert.equal(summaryAfterDeleteResult.response.status, 200);
  assert.equal(
    summaryAfterDeleteResult.payload?.metrics.totalReviews,
    totalReviewsBeforeDelete - 1
  );
  assert.ok(
    summaryAfterDeleteResult.payload?.recentReviews.every(
      review => review.id !== reviewCreateResult.payload?.id
    )
  );

  const userReviewsAfterDeleteResult = await apiRequest<Array<{ id: string }>>('/api/reviews', {
    token: userSession.accessToken
  });
  assert.equal(userReviewsAfterDeleteResult.response.status, 200);
  assert.ok(
    userReviewsAfterDeleteResult.payload?.every(
      review => review.id !== reviewCreateResult.payload?.id
    )
  );
});

runIntegrationTest('profile and billing endpoints require authentication', async () => {
  const profileResult = await apiRequest<{
    message: string;
  }>('/api/profile');
  assert.equal(profileResult.response.status, 401);
  assert.match(profileResult.payload?.message ?? '', /authentification requise/i);

  const paymentMethodResult = await apiRequest<{
    message: string;
  }>('/api/profile/payment-method');
  assert.equal(paymentMethodResult.response.status, 401);
  assert.match(paymentMethodResult.payload?.message ?? '', /authentification requise/i);

  const invoicesResult = await apiRequest<{ message: string }>(
    '/api/profile/invoices'
  );
  assert.equal(invoicesResult.response.status, 401);
  assert.match(invoicesResult.payload?.message ?? '', /authentification requise/i);

  const pdfResult = await rawRequest('/api/profile/invoices/missing/pdf');
  assert.equal(pdfResult.response.status, 401);
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

runIntegrationTest('reservation and invoice endpoints keep user resources isolated', async () => {
  const ownerSession = await registerUser();
  const outsiderSession = await registerUser();
  const reservationDate = '2099-04-18';

  const ownerVehicleResult = await createVehicle(ownerSession.accessToken, {
    name: 'Mazda 3',
    model: 'Mazda 3 2022',
    year: 2022,
    mileage: 18000,
    licensePlate: 'QC-321'
  });
  assert.equal(ownerVehicleResult.response.status, 201);

  const availableSlotsResult = await apiRequest<string[]>(
    `/api/reservations/slots?serviceId=oil-change&date=${reservationDate}`
  );
  assert.equal(availableSlotsResult.response.status, 200);
  assert.ok((availableSlotsResult.payload?.length ?? 0) >= 2);

  const ownerReservationResult = await createReservation(ownerSession.accessToken, {
    vehicleId: ownerVehicleResult.payload?.id,
    date: reservationDate,
    time: availableSlotsResult.payload?.[0],
    notes: 'Reservation privee'
  });
  assert.equal(ownerReservationResult.response.status, 201);

  const ownerInvoicesResult = await apiRequest<Array<{ id: string; serviceLabel: string }>>(
    '/api/profile/invoices',
    {
      token: ownerSession.accessToken
    }
  );
  assert.equal(ownerInvoicesResult.response.status, 200);
  assert.equal(ownerInvoicesResult.payload?.length, 1);
  assert.equal(ownerInvoicesResult.payload?.[0]?.serviceLabel, 'Vidange');

  const foreignReservationReadResult = await apiRequest<{ message: string }>(
    `/api/reservations/${ownerReservationResult.payload?.id}`,
    {
      token: outsiderSession.accessToken
    }
  );
  assert.equal(foreignReservationReadResult.response.status, 404);
  assert.match(foreignReservationReadResult.payload?.message ?? '', /not found/i);

  const foreignReservationUpdateResult = await apiRequest<{ message: string }>(
    `/api/reservations/${ownerReservationResult.payload?.id}`,
    {
      method: 'PATCH',
      token: outsiderSession.accessToken,
      body: {
        notes: 'Tentative externe'
      }
    }
  );
  assert.equal(foreignReservationUpdateResult.response.status, 404);
  assert.match(foreignReservationUpdateResult.payload?.message ?? '', /not found/i);

  const foreignVehicleReservationResult = await createReservation(outsiderSession.accessToken, {
    vehicleId: ownerVehicleResult.payload?.id,
    date: reservationDate,
    time: availableSlotsResult.payload?.[1]
  });
  assert.equal(foreignVehicleReservationResult.response.status, 404);
  assert.equal(
    foreignVehicleReservationResult.payload?.message,
    'Vehicule introuvable pour cet utilisateur'
  );

  const foreignInvoicePdfResult = await apiRequest<{ message: string }>(
    `/api/profile/invoices/${ownerInvoicesResult.payload?.[0]?.id}/pdf`,
    {
      token: outsiderSession.accessToken
    }
  );
  assert.equal(foreignInvoicePdfResult.response.status, 404);
  assert.equal(foreignInvoicePdfResult.payload?.message, 'Invoice not found');
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
        date: '2099-04-18',
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
  assert.equal(createTutorialResult.payload?.rating, 0);

  const listTutorialsResult = await apiRequest<Array<{ id: string }>>('/api/tutorials');
  assert.equal(listTutorialsResult.response.status, 200);
  assert.ok(listTutorialsResult.payload?.some(item => item.id === createTutorialResult.payload?.id));

  const searchTutorialsResult = await apiRequest<Array<{ id: string }>>('/api/tutorials/search?q=batterie');
  assert.equal(searchTutorialsResult.response.status, 200);
  assert.ok(searchTutorialsResult.payload?.some(item => item.id === createTutorialResult.payload?.id));

  const searchTutorialsWithoutQueryResult = await apiRequest<Array<{ id: string }>>('/api/tutorials/search');
  assert.equal(searchTutorialsWithoutQueryResult.response.status, 200);
  assert.ok(
    searchTutorialsWithoutQueryResult.payload?.some(item => item.id === createTutorialResult.payload?.id)
  );

  const searchTutorialsByInstructionResult = await apiRequest<Array<{ id: string }>>(
    '/api/tutorials/search?q=tension'
  );
  assert.equal(searchTutorialsByInstructionResult.response.status, 200);
  assert.ok(
    searchTutorialsByInstructionResult.payload?.some(item => item.id === createTutorialResult.payload?.id)
  );

  const searchTutorialsByToolResult = await apiRequest<Array<{ id: string }>>(
    '/api/tutorials/search?q=multimetre'
  );
  assert.equal(searchTutorialsByToolResult.response.status, 200);
  assert.ok(searchTutorialsByToolResult.payload?.some(item => item.id === createTutorialResult.payload?.id));

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

  const anonymousIncrementViewsResult = await apiRequest<null>(
    `/api/tutorials/${createTutorialResult.payload?.id}/views`,
    {
      method: 'POST'
    }
  );
  assert.equal(anonymousIncrementViewsResult.response.status, 204);

  const tutorialAfterAnonymousViewResult = await apiRequest<{ id: string; views: number }>(
    `/api/tutorials/${createTutorialResult.payload?.id}`
  );
  assert.equal(tutorialAfterAnonymousViewResult.response.status, 200);
  assert.equal(tutorialAfterAnonymousViewResult.payload?.views, 0);

  const firstIncrementViewsResult = await apiRequest<null>(
    `/api/tutorials/${createTutorialResult.payload?.id}/views`,
    {
      method: 'POST',
      token: session.accessToken
    }
  );
  assert.equal(firstIncrementViewsResult.response.status, 204);

  const tutorialAfterFirstQualifiedViewResult = await apiRequest<{ id: string; views: number }>(
    `/api/tutorials/${createTutorialResult.payload?.id}`
  );
  assert.equal(tutorialAfterFirstQualifiedViewResult.response.status, 200);
  assert.equal(tutorialAfterFirstQualifiedViewResult.payload?.views, 1);

  const secondIncrementViewsResult = await apiRequest<null>(
    `/api/tutorials/${createTutorialResult.payload?.id}/views`,
    {
      method: 'POST',
      token: session.accessToken
    }
  );
  assert.equal(secondIncrementViewsResult.response.status, 204);

  const tutorialAfterSecondQualifiedViewResult = await apiRequest<{ id: string; views: number }>(
    `/api/tutorials/${createTutorialResult.payload?.id}`
  );
  assert.equal(tutorialAfterSecondQualifiedViewResult.response.status, 200);
  assert.equal(tutorialAfterSecondQualifiedViewResult.payload?.views, 1);

  const sessionUser = await prismaClient.user.findUnique({
    where: { email: session.email },
    select: { id: true }
  });
  assert.ok(sessionUser?.id);

  await prismaClient.tutorialView.update({
    where: {
      userId_tutorialId: {
        userId: sessionUser.id,
        tutorialId: createTutorialResult.payload!.id
      }
    },
    data: {
      lastViewedAt: new Date(Date.now() - (25 * 60 * 60 * 1000))
    }
  });

  const thirdIncrementViewsResult = await apiRequest<null>(
    `/api/tutorials/${createTutorialResult.payload?.id}/views`,
    {
      method: 'POST',
      token: session.accessToken
    }
  );
  assert.equal(thirdIncrementViewsResult.response.status, 204);

  const tutorialAfterThirdQualifiedViewResult = await apiRequest<{ id: string; views: number }>(
    `/api/tutorials/${createTutorialResult.payload?.id}`
  );
  assert.equal(tutorialAfterThirdQualifiedViewResult.response.status, 200);
  assert.equal(tutorialAfterThirdQualifiedViewResult.payload?.views, 2);

  const rateTutorialResult = await apiRequest<{ id: string; rating: number }>(
    `/api/tutorials/${createTutorialResult.payload?.id}/rate`,
    {
      method: 'POST',
      token: session.accessToken,
      body: {
        rating: 5
      }
    }
  );
  assert.equal(rateTutorialResult.response.status, 200);
  assert.equal(rateTutorialResult.payload?.rating, 5);

  const secondRatingSession = await registerUser();
  const secondRateTutorialResult = await apiRequest<{ id: string; rating: number }>(
    `/api/tutorials/${createTutorialResult.payload?.id}/rate`,
    {
      method: 'POST',
      token: secondRatingSession.accessToken,
      body: {
        rating: 3
      }
    }
  );
  assert.equal(secondRateTutorialResult.response.status, 200);
  assert.equal(secondRateTutorialResult.payload?.rating, 4);

  const updateTutorialResult = await apiRequest<{ id: string; title: string; difficulty: string; rating: number }>(
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
  assert.equal(updateTutorialResult.payload?.rating, 4);

  const invalidTutorialUpdateResult = await apiRequest<{ message: string }>(
    `/api/tutorials/${createTutorialResult.payload?.id}`,
    {
      method: 'PUT',
      token: adminSession.accessToken,
      body: {
        title: 'Verifier la batterie 12V',
        description: 'Tutoriel invalide',
        category: 'batterie',
        difficulty: 'expert',
        duration: 14,
        thumbnail: 'https://example.com/battery.png',
        videoUrl: 'https://example.com/battery-updated.mp4',
        instructions: ['Tester la batterie'],
        tools: ['Multimetre']
      }
    }
  );
  assert.equal(invalidTutorialUpdateResult.response.status, 400);

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
    method: 'POST',
    token: session.accessToken
  });
  assert.equal(missingTutorialViewResult.response.status, 204);

  const invalidTutorialCreateResult = await apiRequest<{ message: string }>('/api/tutorials', {
    method: 'POST',
    token: adminSession.accessToken,
    body: {
      title: null
    }
  });
  assert.equal(invalidTutorialCreateResult.response.status, 400);

  const unauthenticatedTutorialRateResult = await apiRequest<{ message: string }>(
    `/api/tutorials/${createTutorialResult.payload?.id}/rate`,
    {
      method: 'POST',
      body: {
        rating: 4
      }
    }
  );
  assert.equal(unauthenticatedTutorialRateResult.response.status, 401);

  const invalidTutorialRateResult = await apiRequest<{ message: string }>(
    `/api/tutorials/${createTutorialResult.payload?.id}/rate`,
    {
      method: 'POST',
      token: session.accessToken,
      body: {
        rating: 6
      }
    }
  );
  assert.equal(invalidTutorialRateResult.response.status, 400);

  const missingTutorialRateResult = await apiRequest<{ message: string }>('/api/tutorials/missing-id/rate', {
    method: 'POST',
    token: session.accessToken,
    body: {
      rating: 4
    }
  });
  assert.equal(missingTutorialRateResult.response.status, 404);

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
  assert.equal(missingTutorialUpdateResult.response.status, 404);

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
  assert.match(pdfResult.response.headers.get('content-disposition') ?? '', /attachment; filename=/i);
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
  assert.equal(missingTutorialDeleteResult.response.status, 404);
});
