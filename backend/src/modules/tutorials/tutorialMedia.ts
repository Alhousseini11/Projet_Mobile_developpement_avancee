import fs from 'node:fs/promises';
import path from 'node:path';
import type { Request } from 'express';

const tutorialUploadsDir = path.resolve(process.cwd(), 'uploads', 'tutorials');
const tutorialUploadsPublicPrefix = '/uploads/tutorials/';

interface BuildPublicAssetUrlOptions {
  publicBaseUrl?: string | null;
}

function normalizeConfiguredPublicBaseUrl(value?: string | null) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) {
    return null;
  }

  try {
    const normalized = new URL(trimmed.endsWith('/') ? trimmed : `${trimmed}/`);
    return normalized.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function normalizePublicRelativePath(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function readForwardedHeader(req: Request, headerName: string) {
  const rawValue = req.get(headerName)?.trim();
  if (!rawValue) {
    return null;
  }

  const [firstValue] = rawValue.split(',');
  return firstValue?.trim() || null;
}

export function buildTutorialUploadPublicPath(filename: string) {
  const trimmed = typeof filename === 'string' ? filename.trim() : '';
  const basename = path.basename(trimmed);

  if (!basename || basename !== trimmed) {
    throw new Error('Invalid tutorial upload filename.');
  }

  return `${tutorialUploadsPublicPrefix}${basename}`;
}

export function buildPublicAssetUrl(
  req: Request,
  relativePath: string,
  options: BuildPublicAssetUrlOptions = {}
) {
  const normalizedPath = normalizePublicRelativePath(relativePath);
  const configuredBaseUrl = normalizeConfiguredPublicBaseUrl(options.publicBaseUrl);

  if (configuredBaseUrl) {
    return new URL(normalizedPath.replace(/^\/+/, ''), `${configuredBaseUrl}/`).toString();
  }

  const protocol = readForwardedHeader(req, 'x-forwarded-proto') || req.protocol || 'http';
  const host = readForwardedHeader(req, 'x-forwarded-host') || req.get('host')?.trim() || null;

  if (!host) {
    return normalizedPath;
  }

  return `${protocol}://${host}${normalizedPath}`;
}

function extractMediaPathname(videoUrl: string | null | undefined) {
  const trimmed = typeof videoUrl === 'string' ? videoUrl.trim() : '';
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).pathname;
    } catch {
      return null;
    }
  }

  return trimmed.startsWith('/') ? trimmed : null;
}

export function resolveManagedTutorialVideoPath(videoUrl: string | null | undefined) {
  const pathname = extractMediaPathname(videoUrl);
  if (!pathname) {
    return null;
  }

  let decodedPathname = pathname;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    decodedPathname = pathname;
  }

  if (!decodedPathname.startsWith(tutorialUploadsPublicPrefix)) {
    return null;
  }

  const fileSegment = decodedPathname.slice(tutorialUploadsPublicPrefix.length);
  if (!fileSegment || fileSegment.includes('/') || fileSegment.includes('\\')) {
    return null;
  }

  return path.resolve(tutorialUploadsDir, fileSegment);
}

export function areSameManagedTutorialVideoUrl(
  leftVideoUrl: string | null | undefined,
  rightVideoUrl: string | null | undefined
) {
  const leftPath = resolveManagedTutorialVideoPath(leftVideoUrl);
  const rightPath = resolveManagedTutorialVideoPath(rightVideoUrl);

  return Boolean(leftPath && rightPath && leftPath === rightPath);
}

export async function removeManagedTutorialVideoByUrl(videoUrl: string | null | undefined) {
  const absolutePath = resolveManagedTutorialVideoPath(videoUrl);
  if (!absolutePath) {
    return false;
  }

  try {
    await fs.unlink(absolutePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

export async function removeTutorialVideoFileByFilename(filename: string | null | undefined) {
  const trimmed = typeof filename === 'string' ? filename.trim() : '';
  const basename = path.basename(trimmed);

  if (!basename || basename !== trimmed) {
    return false;
  }

  return removeManagedTutorialVideoByUrl(buildTutorialUploadPublicPath(basename));
}

export const __tutorialMediaInternals = {
  normalizeConfiguredPublicBaseUrl,
  tutorialUploadsDir,
  tutorialUploadsPublicPrefix,
  resolveManagedTutorialVideoPath
};
