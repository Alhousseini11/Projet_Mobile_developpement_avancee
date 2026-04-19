import crypto from 'crypto';
import type { Request } from 'express';
import { Role, type User } from '../../data/prisma/generatedClient';
import { DEMO_ACCOUNT, isDemoModeEnabled } from '../../config/demo';
import { env, requireEnv } from '../../config/env';
import { prisma } from '../../data/prisma/client';
import { AppError } from '../../shared/errors';
import { isPasswordResetEmailEnabled, sendPasswordResetEmail } from './passwordResetMailer';

const ACCESS_TOKEN_TTL_MS = 1000 * 60 * 60 * 12;
const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30;

type TokenType = 'access' | 'refresh' | 'password-reset';

interface SignedTokenPayload {
  sub: string;
  email: string;
  role: Role;
  type: TokenType;
  iat: number;
  exp: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  createdAt: Date;
}

export interface AuthSessionPayload {
  accessToken: string;
  refreshToken: string;
  loginAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    role: Role;
  };
}

export interface ForgotPasswordPayload {
  message: string;
  resetToken?: string;
  resetCode?: string;
  expiresAt?: string;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function assertEmail(email: string) {
  const value = normalizeEmail(email);
  if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new AppError('Adresse email invalide.', 400);
  }
  return value;
}

function assertPassword(password: string) {
  const value = password.trim();
  if (value.length < 8) {
    throw new AppError('Le mot de passe doit contenir au moins 8 caracteres.', 400);
  }
  return value;
}

function assertResetCode(code: string) {
  const value = code.trim().replace(/\s+/g, '');
  if (!/^\d{6}$/.test(value)) {
    throw new AppError('Le code de reinitialisation doit contenir 6 chiffres.', 400);
  }
  return value;
}

function assertFullName(fullName: string) {
  const value = fullName.trim();
  if (value.length < 2) {
    throw new AppError('Le nom complet est obligatoire.', 400);
  }
  return value;
}

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8');
}

function getJwtSecret() {
  return requireEnv('JWT_SECRET');
}

function signToken(payload: SignedTokenPayload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

function verifySignedToken(token: string, expectedType: TokenType) {
  const [encodedPayload, signature] = token.split('.');

  if (!encodedPayload || !signature) {
    throw new AppError('Jeton invalide.', 401);
  }

  const expectedSignature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(encodedPayload)
    .digest('base64url');

  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    throw new AppError('Jeton invalide.', 401);
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SignedTokenPayload;

  if (payload.type !== expectedType) {
    throw new AppError('Type de jeton invalide.', 401);
  }

  if (payload.exp <= Date.now()) {
    throw new AppError('Jeton expire.', 401);
  }

  return payload;
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, hash] = passwordHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !hash) {
    return false;
  }

  const derived = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, 'hex');

  return derived.length === stored.length && crypto.timingSafeEqual(derived, stored);
}

function generateResetCode() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}

function hashResetCode(userId: string, code: string) {
  return crypto
    .createHmac('sha256', getJwtSecret())
    .update(`${userId}:${code}`)
    .digest('hex');
}

function serializeUser(user: AuthenticatedUser) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role
  };
}

function assertUserIsActive(user: Pick<User, 'active'>) {
  if (!user.active) {
    throw new AppError('Ce compte a ete desactive. Contactez un administrateur.', 403);
  }
}

function toAuthenticatedUser(user: User): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt
  };
}

function createSession(user: AuthenticatedUser): AuthSessionPayload {
  const now = Date.now();

  return {
    accessToken: signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
      iat: now,
      exp: now + ACCESS_TOKEN_TTL_MS
    }),
    refreshToken: signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'refresh',
      iat: now,
      exp: now + REFRESH_TOKEN_TTL_MS
    }),
    loginAt: new Date(now).toISOString(),
    user: serializeUser(user)
  };
}

export async function ensureDemoUserExists() {
  if (!isDemoModeEnabled()) {
    return null;
  }

  const existing = await prisma.user.findUnique({
    where: { email: DEMO_ACCOUNT.email }
  });

  if (existing) {
    return toAuthenticatedUser(existing);
  }

  const created = await prisma.user.create({
    data: {
      email: DEMO_ACCOUNT.email,
      fullName: DEMO_ACCOUNT.fullName,
      phone: DEMO_ACCOUNT.phone,
      passwordHash: hashPassword(DEMO_ACCOUNT.password),
      role: Role.USER
    }
  });

  return toAuthenticatedUser(created);
}

export async function registerUser(payload: {
  fullName: string;
  email: string;
  password: string;
  phone?: string | null;
}) {
  const email = assertEmail(payload.email);
  const fullName = assertFullName(payload.fullName);
  const password = assertPassword(payload.password);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('Un compte existe deja avec cette adresse email.', 409);
  }

  const created = await prisma.user.create({
    data: {
      email,
      fullName,
      phone: payload.phone?.trim() || null,
      passwordHash: hashPassword(password),
      role: Role.USER
    }
  });

  return createSession(toAuthenticatedUser(created));
}

export async function loginUser(payload: { email: string; password: string }) {
  await ensureDemoUserExists();

  const email = assertEmail(payload.email);
  const password = payload.password.trim();
  if (!password) {
    throw new AppError('Le mot de passe est obligatoire.', 400);
  }

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new AppError('Email ou mot de passe invalide.', 401);
  }

  assertUserIsActive(user);
  return createSession(toAuthenticatedUser(user));
}

export async function refreshAuthSession(refreshToken: string) {
  const payload = verifySignedToken(refreshToken.trim(), 'refresh');

  const user = await prisma.user.findUnique({
    where: { id: payload.sub }
  });

  if (!user) {
    throw new AppError('Session introuvable.', 401);
  }

  assertUserIsActive(user);
  return createSession(toAuthenticatedUser(user));
}

export async function requestPasswordReset(emailInput: string): Promise<ForgotPasswordPayload> {
  await ensureDemoUserExists();

  const email = assertEmail(emailInput);
  const shouldSendEmail = isPasswordResetEmailEnabled();
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    return {
      message: shouldSendEmail
        ? 'Si un compte existe, un email de reinitialisation a ete envoye.'
        : 'Si un compte existe, un lien de reinitialisation a ete prepare.'
    };
  }

  if (!user.active) {
    return {
      message: shouldSendEmail
        ? 'Si un compte existe, un email de reinitialisation a ete envoye.'
        : 'Si un compte existe, un lien de reinitialisation a ete prepare.'
    };
  }

  const now = Date.now();
  const expiresAt = new Date(now + PASSWORD_RESET_TTL_MS).toISOString();
  const resetToken = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'password-reset',
    iat: now,
    exp: now + PASSWORD_RESET_TTL_MS
  });
  const resetCode = generateResetCode();

  await prisma.passwordResetCode.deleteMany({
    where: { userId: user.id }
  });

  await prisma.passwordResetCode.create({
    data: {
      userId: user.id,
      codeHash: hashResetCode(user.id, resetCode),
      expiresAt: new Date(expiresAt)
    }
  });

  if (shouldSendEmail) {
    await sendPasswordResetEmail({
      toEmail: user.email,
      fullName: user.fullName,
      resetCode,
      expiresAt
    });
  }

  return {
    message: shouldSendEmail
      ? 'Si un compte existe, un email de reinitialisation a ete envoye.'
      : 'Code de reinitialisation genere. Utilisez le code recu pour definir un nouveau mot de passe.',
    resetToken: env.NODE_ENV === 'production' ? undefined : resetToken,
    resetCode: env.NODE_ENV === 'production' ? undefined : resetCode,
    expiresAt
  };
}

async function resetPasswordWithTokenValue(token: string) {
  const verified = verifySignedToken(token.trim(), 'password-reset');

  const user = await prisma.user.findUnique({
    where: { id: verified.sub }
  });

  if (!user || user.email !== verified.email) {
    throw new AppError('Compte introuvable pour ce jeton.', 404);
  }

  assertUserIsActive(user);
  return user;
}

async function resetPasswordWithCodeValue(emailInput: string, codeInput: string) {
  const email = assertEmail(emailInput);
  const code = assertResetCode(codeInput);
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new AppError('Code de reinitialisation invalide ou expire.', 401);
  }

  const passwordResetCode = await prisma.passwordResetCode.findFirst({
    where: {
      userId: user.id,
      codeHash: hashResetCode(user.id, code),
      expiresAt: {
        gt: new Date()
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (!passwordResetCode) {
    throw new AppError('Code de reinitialisation invalide ou expire.', 401);
  }

  assertUserIsActive(user);
  return user;
}

export async function resetPasswordWithToken(payload: {
  token?: string;
  email?: string;
  code?: string;
  newPassword: string;
}) {
  const password = assertPassword(payload.newPassword);
  let user: User | null = null;

  if (payload.token?.trim()) {
    user = await resetPasswordWithTokenValue(payload.token);
  } else if (payload.email?.trim() || payload.code?.trim()) {
    user = await resetPasswordWithCodeValue(String(payload.email ?? ''), String(payload.code ?? ''));
  } else {
    throw new AppError('Jeton ou code de reinitialisation requis.', 400);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(password)
    }
  });

  await prisma.passwordResetCode.deleteMany({
    where: { userId: user.id }
  });

  return {
    ...createSession(toAuthenticatedUser(updated)),
    message: 'Mot de passe reinitialise avec succes.'
  };
}

export function extractBearerToken(req: Request) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length).trim();
}

export async function resolveUserFromAccessToken(accessToken: string) {
  const payload = verifySignedToken(accessToken.trim(), 'access');

  const user = await prisma.user.findUnique({
    where: { id: payload.sub }
  });

  if (!user) {
    throw new AppError('Session invalide.', 401);
  }

  assertUserIsActive(user);
  return toAuthenticatedUser(user);
}

export async function resolveOptionalRequestUser(req: Request) {
  const token = extractBearerToken(req);
  if (!token) {
    return null;
  }

  try {
    return await resolveUserFromAccessToken(token);
  } catch {
    return null;
  }
}
