import test from 'node:test';
import assert from 'node:assert/strict';
import { __adminUploadInternals } from '../src/modules/admin/adminUpload';

test('sanitizeFilename removes accents, spaces and unsafe characters', () => {
  assert.equal(
    __adminUploadInternals.sanitizeFilename('Tutoriel Batterie Été 2026!.mp4'),
    'tutoriel-batterie-ete-2026-.mp4'
  );
  assert.equal(__adminUploadInternals.sanitizeFilename('   '), '');
});

test('fileFilter accepts supported video mime types', () => {
  let accepted: boolean | undefined;

  __adminUploadInternals.fileFilter(
    {} as Express.Request,
    {
      mimetype: 'video/mp4'
    } as Express.Multer.File,
    (error: Error | null, next?: boolean) => {
      assert.equal(error, null);
      accepted = next;
    }
  );

  assert.equal(accepted, true);
});

test('fileFilter rejects unsupported upload mime types', () => {
  let capturedError: unknown = null;

  __adminUploadInternals.fileFilter(
    {} as Express.Request,
    {
      mimetype: 'image/png'
    } as Express.Multer.File,
    error => {
      capturedError = error as Error;
    }
  );

  assert.ok(capturedError instanceof Error);
  assert.match((capturedError as Error).message, /Format video non supporte/i);
});
