import test from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '../src/data/prisma/generatedClient';
import { describePrismaError } from '../src/data/prisma/prismaError';

function createKnownRequestError(code: string, meta?: Record<string, unknown>) {
  const error = Object.create(Prisma.PrismaClientKnownRequestError.prototype) as Prisma.PrismaClientKnownRequestError;
  Object.assign(error, {
    code,
    meta,
    name: 'PrismaClientKnownRequestError',
    message: `Prisma failure ${code}`,
    clientVersion: 'test'
  });
  return error;
}

test('describePrismaError returns structured details for known Prisma request errors', () => {
  const error = createKnownRequestError('P2022', {
    modelName: 'Reservation',
    column: 'status'
  });

  assert.deepEqual(describePrismaError(error), {
    kind: 'known_request',
    name: 'PrismaClientKnownRequestError',
    message: 'Prisma failure P2022',
    code: 'P2022',
    clientVersion: 'test',
    meta: {
      modelName: 'Reservation',
      column: 'status'
    }
  });
});

test('describePrismaError ignores non Prisma errors', () => {
  assert.equal(describePrismaError(new Error('boom')), null);
  assert.equal(describePrismaError({ code: 'P2022' }), null);
});
