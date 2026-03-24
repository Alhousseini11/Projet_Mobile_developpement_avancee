import { Request, Response } from 'express';
import { logger } from '../../config/logger';
import { prisma } from '../../data/prisma/client';
import { isSchemaDriftError } from '../_shared/isSchemaDriftError';
import { isCurrentTutorialSchemaAvailable } from '../_shared/schemaCapabilities';

type TutorialCategory =
  | 'entretien'
  | 'freins'
  | 'suspension'
  | 'batterie'
  | 'diagnostic'
  | 'eclairage'
  | 'fluide'
  | 'mecanique';

type TutorialDifficulty = 'facile' | 'moyen' | 'difficile';

interface TutorialResponse {
  id: string;
  title: string;
  description: string;
  category: TutorialCategory;
  difficulty: TutorialDifficulty;
  duration: number;
  views: number;
  rating: number;
  thumbnail: string;
  videoUrl: string;
  instructions: string[];
  tools: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface LegacyTutorialRow {
  id: string;
  title: string;
  category: string | null;
  difficulty: string | null;
  videoUrl: string | null;
  thumbnail: string | null;
  durationSec: number | null;
  createdAt: Date | string | null;
}

const FALLBACK_TUTORIALS: TutorialResponse[] = [
  {
    id: 'tutorial-brakes-fallback',
    title: 'Changer les plaquettes de frein',
    description: 'Guide de base pour verifier et remplacer les plaquettes de frein.',
    category: 'freins',
    difficulty: 'moyen',
    duration: 8,
    views: 0,
    rating: 0,
    thumbnail: 'res://logo',
    videoUrl: 'https://example.com/videos/brake-pads',
    instructions: [
      'Lever le vehicule de maniere securisee.',
      'Retirer la roue.',
      'Verifier l usure des plaquettes.',
      'Reposer les nouvelles pieces et tester le freinage.'
    ],
    tools: ['Cric', 'Cle de roue', 'Gants'],
    createdAt: new Date('2026-01-01T09:00:00.000Z'),
    updatedAt: new Date('2026-01-01T09:00:00.000Z')
  }
];

function normalizeDate(value: Date | string | null | undefined) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

function ensureStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function normalizeCategory(value: string | null | undefined): TutorialCategory {
  const normalized = value?.toLowerCase();

  switch (normalized) {
    case 'freins':
      return 'freins';
    case 'suspension':
      return 'suspension';
    case 'batterie':
    case 'battery':
      return 'batterie';
    case 'diagnostic':
      return 'diagnostic';
    case 'eclairage':
    case 'lighting':
      return 'eclairage';
    case 'fluide':
    case 'fluid':
      return 'fluide';
    case 'mecanique':
    case 'mechanique':
    case 'mechanic':
      return 'mecanique';
    case 'entretien':
    case 'maintenance':
    default:
      return 'entretien';
  }
}

function normalizeDifficulty(value: string | null | undefined): TutorialDifficulty {
  const normalized = value?.toLowerCase();

  switch (normalized) {
    case 'easy':
    case 'facile':
      return 'facile';
    case 'hard':
    case 'difficile':
      return 'difficile';
    case 'medium':
    case 'moyen':
    default:
      return 'moyen';
  }
}

function normalizeDuration(duration: number | null | undefined) {
  if (!Number.isFinite(duration)) {
    return 0;
  }

  return Math.max(0, Math.round(Number(duration)));
}

function normalizeDurationFromSeconds(durationSec: number | null | undefined) {
  if (!Number.isFinite(durationSec)) {
    return 0;
  }

  return Math.max(1, Math.round(Number(durationSec) / 60));
}

function cloneTutorial(tutorial: TutorialResponse): TutorialResponse {
  return {
    ...tutorial,
    instructions: [...tutorial.instructions],
    tools: [...tutorial.tools],
    createdAt: new Date(tutorial.createdAt),
    updatedAt: new Date(tutorial.updatedAt)
  };
}

function mapCurrentTutorial(tutorial: {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: number;
  views: number;
  rating: number;
  thumbnail: string;
  videoUrl: string;
  instructions: unknown;
  tools: unknown;
  createdAt: Date;
  updatedAt: Date;
}): TutorialResponse {
  return {
    id: tutorial.id,
    title: tutorial.title,
    description: tutorial.description,
    category: normalizeCategory(tutorial.category),
    difficulty: normalizeDifficulty(tutorial.difficulty),
    duration: normalizeDuration(tutorial.duration),
    views: Math.max(0, tutorial.views ?? 0),
    rating: Number.isFinite(tutorial.rating) ? tutorial.rating : 0,
    thumbnail: tutorial.thumbnail || 'res://logo',
    videoUrl: tutorial.videoUrl,
    instructions: ensureStringArray(tutorial.instructions),
    tools: ensureStringArray(tutorial.tools),
    createdAt: tutorial.createdAt,
    updatedAt: tutorial.updatedAt
  };
}

function mapLegacyTutorial(row: LegacyTutorialRow): TutorialResponse {
  const createdAt = normalizeDate(row.createdAt);

  return {
    id: row.id,
    title: row.title,
    description: 'Tutoriel atelier disponible sur cette deployment legacy.',
    category: normalizeCategory(row.category),
    difficulty: normalizeDifficulty(row.difficulty),
    duration: normalizeDurationFromSeconds(row.durationSec),
    views: 0,
    rating: 0,
    thumbnail: row.thumbnail || 'res://logo',
    videoUrl: row.videoUrl || 'https://example.com/videos/tutorial',
    instructions: [],
    tools: [],
    createdAt,
    updatedAt: createdAt
  };
}

async function readCurrentTutorials() {
  const tutorials = await prisma.tutorial.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      difficulty: true,
      duration: true,
      views: true,
      rating: true,
      thumbnail: true,
      videoUrl: true,
      instructions: true,
      tools: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return tutorials.map(tutorial => mapCurrentTutorial({
    ...tutorial,
    category: String(tutorial.category),
    difficulty: String(tutorial.difficulty)
  }));
}

async function readLegacyTutorials() {
  const rows = await prisma.$queryRaw<LegacyTutorialRow[]>`
    SELECT "id", "title", "category", "difficulty", "videoUrl", "thumbnail", "durationSec", "createdAt"
    FROM "Tutorial"
    ORDER BY "createdAt" DESC
  `;

  return rows.map(mapLegacyTutorial);
}

async function readTutorialCatalog() {
  if (!(await isCurrentTutorialSchemaAvailable())) {
    try {
      return await readLegacyTutorials();
    } catch (legacySchemaError) {
      logger.error(
        { err: legacySchemaError },
        'Unable to read tutorials from legacy schema'
      );
      return FALLBACK_TUTORIALS.map(cloneTutorial);
    }
  }

  try {
    return await readCurrentTutorials();
  } catch (currentSchemaError) {
    if (!isSchemaDriftError(currentSchemaError)) {
      logger.error({ err: currentSchemaError }, 'Unable to read tutorials from current schema');
      return FALLBACK_TUTORIALS.map(cloneTutorial);
    }

    logger.warn({ err: currentSchemaError }, 'Falling back to legacy tutorial schema');

    try {
      return await readLegacyTutorials();
    } catch (legacySchemaError) {
      logger.error(
        { err: legacySchemaError },
        'Unable to read tutorials from current or legacy schema'
      );
      return FALLBACK_TUTORIALS.map(cloneTutorial);
    }
  }
}

export async function listTutorials(_req: Request, res: Response) {
  res.json(await readTutorialCatalog());
}

export async function createTutorial(req: Request, res: Response) {
  try {
    const data = req.body;
    const tutorial = await prisma.tutorial.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        difficulty: data.difficulty,
        duration: data.duration,
        thumbnail: data.thumbnail,
        videoUrl: data.videoUrl,
        instructions: data.instructions ?? [],
        tools: data.tools ?? [],
        views: data.views ?? 0,
        rating: data.rating ?? 0
      }
    });

    res.status(201).json(mapCurrentTutorial({
      ...tutorial,
      category: String(tutorial.category),
      difficulty: String(tutorial.difficulty)
    }));
  } catch (error) {
    logger.error({ err: error }, 'Error creating tutorial');
    res.status(503).json({ message: 'Tutorial write operations are not available on this deployment.' });
  }
}

export async function getTutorialById(req: Request, res: Response) {
  const { id } = req.params;
  const tutorials = await readTutorialCatalog();
  const tutorial = tutorials.find(entry => entry.id === id);

  if (!tutorial) {
    res.status(404).json({ message: 'Tutorial not found' });
    return;
  }

  res.json(tutorial);
}

export async function updateTutorial(req: Request, res: Response) {
  const { id } = req.params;
  const data = req.body;

  try {
    const tutorial = await prisma.tutorial.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        difficulty: data.difficulty,
        duration: data.duration,
        thumbnail: data.thumbnail,
        videoUrl: data.videoUrl,
        instructions: data.instructions ?? undefined,
        tools: data.tools ?? undefined,
        rating: data.rating ?? undefined
      }
    });

    res.json(mapCurrentTutorial({
      ...tutorial,
      category: String(tutorial.category),
      difficulty: String(tutorial.difficulty)
    }));
  } catch (error) {
    logger.error({ err: error, tutorialId: id }, 'Error updating tutorial');
    res.status(503).json({ message: 'Tutorial write operations are not available on this deployment.' });
  }
}

export async function deleteTutorial(req: Request, res: Response) {
  const { id } = req.params;

  try {
    await prisma.tutorial.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    logger.error({ err: error, tutorialId: id }, 'Error deleting tutorial');
    res.status(503).json({ message: 'Tutorial delete is not available on this deployment.' });
  }
}

export async function getTutorialsByCategory(req: Request, res: Response) {
  const { category } = req.params;
  const tutorials = await readTutorialCatalog();
  res.json(tutorials.filter(tutorial => tutorial.category === normalizeCategory(category)));
}

export async function getPopularTutorials(req: Request, res: Response) {
  const limit = Number(req.query.limit) || 5;
  const tutorials = await readTutorialCatalog();
  res.json(
    [...tutorials]
      .sort((left, right) => right.views - left.views)
      .slice(0, limit)
  );
}

export async function getTopRatedTutorials(req: Request, res: Response) {
  const limit = Number(req.query.limit) || 5;
  const tutorials = await readTutorialCatalog();
  res.json(
    [...tutorials]
      .sort((left, right) => right.rating - left.rating)
      .slice(0, limit)
  );
}

export async function incrementTutorialViews(req: Request, res: Response) {
  const { id } = req.params;

  try {
    await prisma.tutorial.update({
      where: { id },
      data: { views: { increment: 1 } }
    });
  } catch (error) {
    logger.warn({ err: error, tutorialId: id }, 'Tutorial views increment skipped');
  }

  res.status(204).end();
}

export async function rateTutorial(req: Request, res: Response) {
  const { id } = req.params;
  const { rating } = req.body;

  try {
    const tutorial = await prisma.tutorial.update({
      where: { id },
      data: { rating }
    });

    res.json(mapCurrentTutorial({
      ...tutorial,
      category: String(tutorial.category),
      difficulty: String(tutorial.difficulty)
    }));
  } catch (error) {
    logger.error({ err: error, tutorialId: id }, 'Error rating tutorial');
    res.status(503).json({ message: 'Tutorial rating is not available on this deployment.' });
  }
}

export const __tutorialControllerInternals = {
  normalizeDate,
  ensureStringArray,
  normalizeCategory,
  normalizeDifficulty,
  normalizeDuration,
  normalizeDurationFromSeconds,
  cloneTutorial,
  mapCurrentTutorial,
  mapLegacyTutorial
};
