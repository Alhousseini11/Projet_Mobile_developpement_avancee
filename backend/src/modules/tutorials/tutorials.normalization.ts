import { Prisma } from '@prisma/client';
import { AppError } from '../../shared/errors';
import type { TutorialCategory, TutorialDifficulty } from './tutorial.contracts';

export interface TutorialWritePayload {
  title: string;
  description: string;
  category: TutorialCategory;
  difficulty: TutorialDifficulty;
  duration: number;
  thumbnail: string;
  videoUrl: string;
  instructions: string[];
  tools: string[];
}

const QUALIFIED_TUTORIAL_VIEW_WINDOW_MS = 24 * 60 * 60 * 1000;

const tutorialCategoryAliases: Record<string, TutorialCategory> = {
  entretien: 'entretien',
  maintenance: 'entretien',
  freins: 'freins',
  suspension: 'suspension',
  batterie: 'batterie',
  battery: 'batterie',
  diagnostic: 'diagnostic',
  eclairage: 'eclairage',
  lighting: 'eclairage',
  fluide: 'fluide',
  fluid: 'fluide',
  mecanique: 'mecanique',
  mechanique: 'mecanique',
  mechanic: 'mecanique'
};

const tutorialDifficultyAliases: Record<string, TutorialDifficulty> = {
  facile: 'facile',
  easy: 'facile',
  moyen: 'moyen',
  medium: 'moyen',
  difficile: 'difficile',
  hard: 'difficile'
};

function normalizeKey(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
}

function normalizeRequiredText(value: unknown, fieldName: string) {
  if (typeof value !== 'string') {
    throw new AppError(`${fieldName} est requis.`, 400);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new AppError(`${fieldName} est requis.`, 400);
  }

  return trimmed;
}

function normalizePositiveInteger(value: unknown, fieldName: string) {
  const normalized = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new AppError(`${fieldName} doit etre un entier positif.`, 400);
  }

  return normalized;
}

export function resolveTutorialCategory(value: unknown): TutorialCategory | null {
  const normalized = normalizeKey(value);
  if (!normalized) {
    return null;
  }

  return tutorialCategoryAliases[normalized] ?? null;
}

export function resolveTutorialDifficulty(value: unknown): TutorialDifficulty | null {
  const normalized = normalizeKey(value);
  if (!normalized) {
    return null;
  }

  return tutorialDifficultyAliases[normalized] ?? null;
}

export function normalizeTutorialCategory(value: unknown): TutorialCategory {
  return resolveTutorialCategory(value) ?? 'entretien';
}

export function normalizeTutorialDifficulty(value: unknown): TutorialDifficulty {
  return resolveTutorialDifficulty(value) ?? 'moyen';
}

export function normalizeTutorialCategoryInput(value: unknown): TutorialCategory {
  const category = resolveTutorialCategory(value);
  if (!category) {
    throw new AppError('La categorie du tutoriel est invalide.', 400);
  }

  return category;
}

export function normalizeTutorialDifficultyInput(value: unknown): TutorialDifficulty {
  const difficulty = resolveTutorialDifficulty(value);
  if (!difficulty) {
    throw new AppError('La difficulte du tutoriel est invalide.', 400);
  }

  return difficulty;
}

export function normalizeStringList(
  value: unknown,
  fieldName: string,
  options: { required?: boolean } = {}
) {
  if (!Array.isArray(value)) {
    if (options.required) {
      throw new AppError(`${fieldName} est requis.`, 400);
    }

    return [];
  }

  const normalized = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map(entry => entry.trim())
    .filter(Boolean);

  if (options.required && normalized.length === 0) {
    throw new AppError(`${fieldName} est requis.`, 400);
  }

  return normalized;
}

export function normalizeTutorialWritePayload(value: unknown): TutorialWritePayload {
  const payload = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return {
    title: normalizeRequiredText(payload.title, 'Le titre du tutoriel'),
    description: normalizeRequiredText(payload.description, 'La description du tutoriel'),
    category: normalizeTutorialCategoryInput(payload.category),
    difficulty: normalizeTutorialDifficultyInput(payload.difficulty),
    duration: normalizePositiveInteger(payload.duration, 'La duree'),
    thumbnail: normalizeRequiredText(payload.thumbnail, 'La miniature du tutoriel'),
    videoUrl: normalizeRequiredText(payload.videoUrl, 'La video du tutoriel'),
    instructions: normalizeStringList(payload.instructions, 'Au moins une instruction', { required: true }),
    tools: normalizeStringList(payload.tools, 'Les outils')
  };
}

export function buildTutorialCreateData(payload: TutorialWritePayload): Prisma.TutorialCreateInput {
  return {
    title: payload.title,
    description: payload.description,
    category: payload.category,
    difficulty: payload.difficulty,
    duration: payload.duration,
    thumbnail: payload.thumbnail,
    videoUrl: payload.videoUrl,
    instructions: payload.instructions,
    tools: payload.tools,
    views: 0,
    rating: 0
  };
}

export function buildTutorialUpdateData(payload: TutorialWritePayload): Prisma.TutorialUpdateInput {
  return {
    title: payload.title,
    description: payload.description,
    category: payload.category,
    difficulty: payload.difficulty,
    duration: payload.duration,
    thumbnail: payload.thumbnail,
    videoUrl: payload.videoUrl,
    instructions: payload.instructions,
    tools: payload.tools
  };
}

export function normalizeTutorialRating(value: unknown) {
  const normalized = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);

  if (!Number.isInteger(normalized) || normalized < 1 || normalized > 5) {
    throw new AppError('La note du tutoriel doit etre un entier entre 1 et 5.', 400);
  }

  return normalized;
}

export function isPrismaValidationError(error: unknown): error is Prisma.PrismaClientValidationError {
  return error instanceof Prisma.PrismaClientValidationError;
}

export function isPrismaRecordNotFoundError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}

export function shouldCountQualifiedTutorialView(
  lastViewedAt: Date | string | null | undefined,
  reference: Date = new Date()
) {
  if (!(lastViewedAt instanceof Date)) {
    return true;
  }

  if (Number.isNaN(lastViewedAt.getTime())) {
    return true;
  }

  return reference.getTime() - lastViewedAt.getTime() >= QUALIFIED_TUTORIAL_VIEW_WINDOW_MS;
}
