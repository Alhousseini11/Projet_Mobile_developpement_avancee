import { Request, Response } from 'express';
import { AppError } from '../../shared/errors';
import { logger } from '../../config/logger';
import {
  loginUser,
  refreshAuthSession,
  registerUser,
  requestPasswordReset,
  resetPasswordWithToken
} from './auth.service';

function toErrorResponse(req: Request, res: Response, error: unknown) {
  const status = error instanceof AppError ? error.status : 500;
  const message = error instanceof Error ? error.message : 'Internal error';
  logger.error(
    {
      status,
      message,
      stack: error instanceof Error ? error.stack : undefined,
      path: req.path,
      bodyType: typeof req.body,
      bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body) : [],
      email: typeof req.body?.email === 'string' ? req.body.email : undefined,
      hasPassword: typeof req.body?.password === 'string',
      hasNewPassword: typeof req.body?.newPassword === 'string'
    },
    'auth controller error'
  );
  return res.status(status).json({ message });
}

export async function register(req: Request, res: Response) {
  try {
    const session = await registerUser({
      fullName: req.body?.fullName,
      email: req.body?.email,
      password: req.body?.password,
      phone: req.body?.phone
    });

    return res.status(201).json(session);
  } catch (error) {
    return toErrorResponse(req, res, error);
  }
}

export async function login(req: Request, res: Response) {
  try {
    const session = await loginUser({
      email: req.body?.email,
      password: req.body?.password
    });

    return res.json(session);
  } catch (error) {
    return toErrorResponse(req, res, error);
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const session = await refreshAuthSession(String(req.body?.refreshToken ?? ''));
    return res.json(session);
  } catch (error) {
    return toErrorResponse(req, res, error);
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const payload = await requestPasswordReset(String(req.body?.email ?? ''));
    return res.json(payload);
  } catch (error) {
    return toErrorResponse(req, res, error);
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const session = await resetPasswordWithToken({
      token: String(req.body?.token ?? ''),
      newPassword: String(req.body?.newPassword ?? '')
    });

    return res.json(session);
  } catch (error) {
    return toErrorResponse(req, res, error);
  }
}
