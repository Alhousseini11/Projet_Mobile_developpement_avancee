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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderResetPasswordPageDocument(payload: {
  token?: string;
  email?: string;
  errorMessage?: string;
  successMessage?: string;
}) {
  const token = escapeHtml(payload.token ?? '');
  const email = escapeHtml(payload.email ?? '');
  const errorMessage = payload.errorMessage ? escapeHtml(payload.errorMessage) : '';
  const successMessage = payload.successMessage ? escapeHtml(payload.successMessage) : '';
  const hasSuccess = successMessage.length > 0;

  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Reinitialisation du mot de passe</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #111827; color: #111827; }
      .shell { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
      .card { width: 100%; max-width: 480px; background: #ffffff; border-radius: 20px; padding: 28px; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28); }
      .eyebrow { color: #dc2626; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
      h1 { margin: 10px 0 12px; font-size: 30px; line-height: 1.1; }
      p { color: #4b5563; line-height: 1.5; margin: 0 0 18px; }
      label { display: block; margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #374151; }
      input { width: 100%; box-sizing: border-box; border: 1px solid #d1d5db; border-radius: 12px; padding: 14px 16px; font-size: 15px; margin: 0 0 16px; }
      button { width: 100%; border: none; border-radius: 12px; background: #dc2626; color: #ffffff; font-size: 15px; font-weight: 700; padding: 14px 16px; cursor: pointer; }
      .banner { border-radius: 12px; padding: 12px 14px; margin: 0 0 16px; font-size: 13px; font-weight: 600; }
      .banner-error { background: #fff1f2; color: #be123c; }
      .banner-success { background: #ecfdf5; color: #166534; }
      .hint { font-size: 12px; color: #6b7280; margin-top: 14px; }
      .readonly { background: #f9fafb; color: #6b7280; }
      .link { color: #dc2626; font-weight: 700; text-decoration: none; }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="card">
        <div class="eyebrow">Garage Mechanic</div>
        <h1>Reinitialiser votre mot de passe</h1>
        <p>Definissez un nouveau mot de passe pour votre compte. Le lien recu par email reste temporaire.</p>
        ${errorMessage ? `<div class="banner banner-error">${errorMessage}</div>` : ''}
        ${successMessage ? `<div class="banner banner-success">${successMessage}</div>` : ''}
        ${
          hasSuccess
            ? "<p>Vous pouvez maintenant retourner dans l'application et vous connecter avec votre nouveau mot de passe.</p>"
            : `<form method="post" action="/reset-password">
          <input type="hidden" name="token" value="${token}" />
          <label for="email">Adresse email</label>
          <input id="email" class="readonly" type="email" value="${email}" readonly />
          <label for="newPassword">Nouveau mot de passe</label>
          <input id="newPassword" name="newPassword" type="password" minlength="8" placeholder="Minimum 8 caracteres" required />
          <label for="confirmPassword">Confirmation du mot de passe</label>
          <input id="confirmPassword" name="confirmPassword" type="password" minlength="8" placeholder="Confirmez le mot de passe" required />
          <button type="submit">Reinitialiser le mot de passe</button>
        </form>`
        }
        <p class="hint">Si vous n'etes pas a l'origine de cette demande, vous pouvez simplement fermer cette page.</p>
      </section>
    </main>
  </body>
</html>`;
}

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
      token: typeof req.body?.token === 'string' ? req.body.token : undefined,
      email: typeof req.body?.email === 'string' ? req.body.email : undefined,
      code: typeof req.body?.code === 'string' ? req.body.code : undefined,
      newPassword: String(req.body?.newPassword ?? '')
    });

    return res.json(session);
  } catch (error) {
    return toErrorResponse(req, res, error);
  }
}

export function renderResetPasswordPage(req: Request, res: Response) {
  return res
    .status(200)
    .type('html')
    .send(
      renderResetPasswordPageDocument({
        token: String(req.query?.token ?? ''),
        email: String(req.query?.email ?? '')
      })
    );
}

export async function submitResetPasswordPage(req: Request, res: Response) {
  const token = String(req.body?.token ?? '');
  const newPassword = String(req.body?.newPassword ?? '');
  const confirmPassword = String(req.body?.confirmPassword ?? '');
  const email = String(req.query?.email ?? req.body?.email ?? '');

  if (!token.trim()) {
    return res
      .status(400)
      .type('html')
      .send(
        renderResetPasswordPageDocument({
          token,
          email,
          errorMessage: 'Le jeton de reinitialisation est requis.'
        })
      );
  }

  if (!newPassword.trim() || newPassword !== confirmPassword) {
    return res
      .status(400)
      .type('html')
      .send(
        renderResetPasswordPageDocument({
          token,
          email,
          errorMessage: 'Les mots de passe doivent etre remplis et identiques.'
        })
      );
  }

  try {
    await resetPasswordWithToken({
      token,
      newPassword
    });

    return res
      .status(200)
      .type('html')
      .send(
        renderResetPasswordPageDocument({
          successMessage: 'Mot de passe reinitialise avec succes.'
        })
      );
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Internal error';
    logger.error(
      {
        status,
        message,
        stack: error instanceof Error ? error.stack : undefined,
        path: req.path,
        email,
        hasNewPassword: typeof req.body?.newPassword === 'string'
      },
      'reset password page error'
    );

    return res
      .status(status)
      .type('html')
      .send(
        renderResetPasswordPageDocument({
          token,
          email,
          errorMessage: message
        })
      );
  }
}
