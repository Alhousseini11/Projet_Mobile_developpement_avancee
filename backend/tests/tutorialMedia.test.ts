import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import type { Request } from 'express';
import {
  __tutorialMediaInternals,
  areSameManagedTutorialVideoUrl,
  buildPublicAssetUrl,
  buildTutorialUploadPublicPath,
  removeManagedTutorialVideoByUrl,
  removeTutorialVideoFileByFilename
} from '../src/modules/tutorials/tutorialMedia';

function createRequestStub(headers: Record<string, string>, protocol = 'http') {
  return {
    protocol,
    get(name: string) {
      return headers[name.toLowerCase()] ?? headers[name] ?? undefined;
    }
  } as Request;
}

test('buildPublicAssetUrl prefers forwarded headers and supports configured public base URLs', () => {
  const request = createRequestStub({
    host: 'internal-backend:3000',
    'x-forwarded-proto': 'https',
    'x-forwarded-host': 'api.example.com'
  });

  assert.equal(
    buildPublicAssetUrl(request, '/uploads/tutorials/video.mp4'),
    'https://api.example.com/uploads/tutorials/video.mp4'
  );

  assert.equal(
    buildPublicAssetUrl(request, '/uploads/tutorials/video.mp4', {
      publicBaseUrl: 'https://cdn.example.com/media'
    }),
    'https://cdn.example.com/media/uploads/tutorials/video.mp4'
  );

  assert.equal(
    buildPublicAssetUrl(request, 'uploads/tutorials/video.mp4', {
      publicBaseUrl: 'not-a-valid-url'
    }),
    'https://api.example.com/uploads/tutorials/video.mp4'
  );
});

test('buildPublicAssetUrl falls back to relative path when host is unavailable', () => {
  const request = createRequestStub({});

  assert.equal(
    buildPublicAssetUrl(request, 'uploads/tutorials/video.mp4'),
    '/uploads/tutorials/video.mp4'
  );
});

test('buildTutorialUploadPublicPath rejects unsafe filenames', () => {
  assert.equal(
    buildTutorialUploadPublicPath('  video-test.mp4  '),
    '/uploads/tutorials/video-test.mp4'
  );

  assert.throws(
    () => buildTutorialUploadPublicPath('../video-test.mp4'),
    /invalid tutorial upload filename/i
  );

  assert.throws(
    () => buildTutorialUploadPublicPath('   '),
    /invalid tutorial upload filename/i
  );
});

test('tutorial media helpers resolve managed upload paths and compare managed URLs by file path', () => {
  const publicPath = buildTutorialUploadPublicPath('video-test.mp4');
  const resolvedAbsolutePath = __tutorialMediaInternals.resolveManagedTutorialVideoPath(
    `https://api.example.com${publicPath}`
  );

  assert.equal(
    resolvedAbsolutePath,
    `${__tutorialMediaInternals.tutorialUploadsDir}\\video-test.mp4`
  );

  assert.equal(
    areSameManagedTutorialVideoUrl(
      'https://api.example.com/uploads/tutorials/video-test.mp4',
      'https://cdn.example.com/uploads/tutorials/video-test.mp4'
    ),
    true
  );

  assert.equal(
    __tutorialMediaInternals.resolveManagedTutorialVideoPath('https://example.com/external/video.mp4'),
    null
  );

  assert.equal(
    __tutorialMediaInternals.resolveManagedTutorialVideoPath('/uploads/tutorials/nested/video-test.mp4'),
    null
  );

  assert.equal(
    __tutorialMediaInternals.resolveManagedTutorialVideoPath('video-test.mp4'),
    null
  );

  assert.equal(
    areSameManagedTutorialVideoUrl(
      'https://api.example.com/uploads/tutorials/video-test.mp4',
      'https://api.example.com/uploads/tutorials/other-video.mp4'
    ),
    false
  );
});

test('removeManagedTutorialVideoByUrl deletes managed tutorial files and ignores external URLs', async () => {
  const filename = `cleanup-${Date.now()}.mp4`;
  const publicPath = buildTutorialUploadPublicPath(filename);
  const absolutePath = __tutorialMediaInternals.resolveManagedTutorialVideoPath(publicPath);

  assert.ok(absolutePath);

  await fs.mkdir(__tutorialMediaInternals.tutorialUploadsDir, { recursive: true });
  await fs.writeFile(absolutePath!, 'fake-video');

  assert.equal(
    await removeManagedTutorialVideoByUrl(`https://api.example.com${publicPath}`),
    true
  );
  await assert.rejects(() => fs.access(absolutePath!));

  assert.equal(
    await removeManagedTutorialVideoByUrl(`https://api.example.com${publicPath}`),
    false
  );

  assert.equal(
    await removeManagedTutorialVideoByUrl('https://example.com/external/video.mp4'),
    false
  );
});

test('removeTutorialVideoFileByFilename handles invalid and managed filenames', async () => {
  const filename = `cleanup-by-name-${Date.now()}.mp4`;
  const absolutePath = __tutorialMediaInternals.resolveManagedTutorialVideoPath(
    buildTutorialUploadPublicPath(filename)
  );

  assert.ok(absolutePath);

  await fs.mkdir(__tutorialMediaInternals.tutorialUploadsDir, { recursive: true });
  await fs.writeFile(absolutePath!, 'fake-video');

  assert.equal(await removeTutorialVideoFileByFilename(filename), true);
  assert.equal(await removeTutorialVideoFileByFilename(filename), false);
  assert.equal(await removeTutorialVideoFileByFilename('../bad-file.mp4'), false);
});
