import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlaceholderHandler } from '../src/modules/_shared/createPlaceholderHandler';

test('createPlaceholderHandler returns a 501 response with a stable message', async () => {
  const handler = createPlaceholderHandler('chat', 'sendMessage');

  let statusCode = 200;
  let payload: unknown = null;

  const response = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(value: unknown) {
      payload = value;
      return this;
    }
  };

  await handler({} as never, response as never);

  assert.equal(statusCode, 501);
  assert.deepEqual(payload, {
    message: 'chat.sendMessage not implemented'
  });
});
