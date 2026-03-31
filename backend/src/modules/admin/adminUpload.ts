import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';

const tutorialUploadsDir = path.resolve(process.cwd(), 'uploads', 'tutorials');
fs.mkdirSync(tutorialUploadsDir, { recursive: true });

function sanitizeFilename(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, tutorialUploadsDir);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || '').toLowerCase() || '.mp4';
    const basename = sanitizeFilename(path.basename(file.originalname, extension)) || 'tutorial-video';
    callback(null, `${Date.now()}-${basename}${extension}`);
  }
});

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) {
  const allowedMimeTypes = new Set([
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska'
  ]);

  if (allowedMimeTypes.has(file.mimetype)) {
    callback(null, true);
    return;
  }

  callback(new Error('Format video non supporte. Utilisez MP4, WebM, MOV, AVI ou MKV.'));
}

export const __adminUploadInternals = {
  sanitizeFilename,
  fileFilter
};

export const uploadTutorialVideo = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 250 * 1024 * 1024
  }
});
