import test from 'node:test';
import assert from 'node:assert/strict';
import { Role } from '../src/data/prisma/generatedClient';
import { roleGuard } from '../src/core/http/middleware/roleGuard';

function createResponse(authUser?: { role: Role }) {
  return {
    locals: authUser ? { authUser } : {}
  };
}

test('roleGuard rejects unauthenticated requests', () => {
  const middleware = roleGuard([Role.ADMIN]);
  let capturedError: Error | null = null;

  middleware(
    {} as never,
    createResponse() as never,
    error => {
      capturedError = error ?? null;
    }
  );

  assert.ok(capturedError);
  assert.equal((capturedError as Error | null)?.message, 'Authentification requise.');
});

test('roleGuard rejects authenticated users without the required role', () => {
  const middleware = roleGuard([Role.ADMIN]);
  let capturedError: Error | null = null;

  middleware(
    {} as never,
    createResponse({ role: Role.USER }) as never,
    error => {
      capturedError = error ?? null;
    }
  );

  assert.ok(capturedError);
  assert.equal((capturedError as Error | null)?.message, 'Acces refuse.');
});

test('roleGuard allows authenticated users with the required role', () => {
  const middleware = roleGuard([Role.ADMIN]);
  let nextCalled = false;

  middleware(
    {} as never,
    createResponse({ role: Role.ADMIN }) as never,
    error => {
      assert.equal(error, undefined);
      nextCalled = true;
    }
  );

  assert.equal(nextCalled, true);
});
