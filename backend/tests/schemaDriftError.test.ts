import test from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '../src/data/prisma/generatedClient';
import { isSchemaDriftError } from '../src/modules/_shared/isSchemaDriftError';

function createKnownRequestError(code: string) {
  const error = Object.create(Prisma.PrismaClientKnownRequestError.prototype) as Prisma.PrismaClientKnownRequestError;
  Object.assign(error, {
    code,
    name: 'PrismaClientKnownRequestError',
    clientVersion: 'test'
  });
  return error;
}

test('isSchemaDriftError detects Prisma P2022 schema drift errors', () => {
  assert.equal(isSchemaDriftError(createKnownRequestError('P2022')), true);
});

test('isSchemaDriftError ignores other Prisma errors and generic errors', () => {
  assert.equal(isSchemaDriftError(createKnownRequestError('P2002')), false);
  assert.equal(isSchemaDriftError(new Error('boom')), false);
  assert.equal(isSchemaDriftError({ code: 'P2022' }), false);
});
