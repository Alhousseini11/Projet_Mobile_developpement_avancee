import { logger } from '../../config/logger';
import { prisma } from '../../data/prisma/client';
import { isSchemaDriftError } from '../_shared/isSchemaDriftError';
import { isCurrentTutorialSchemaAvailable } from '../_shared/schemaCapabilities';
import type { TutorialContract } from './tutorial.contracts';
import {
  normalizeTutorialCategory,
  normalizeTutorialDifficulty
} from './tutorials.normalization';

export interface TutorialResponse extends Omit<TutorialContract, 'tools'> {
  tools: string[];
}

export interface LegacyTutorialRow {
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

export function normalizeDate(value: Date | string | null | undefined) {
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

export function ensureStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

export function normalizeDuration(duration: number | null | undefined) {
  if (!Number.isFinite(duration)) {
    return 0;
  }

  return Math.max(0, Math.round(Number(duration)));
}

export function normalizeDurationFromSeconds(durationSec: number | null | undefined) {
  if (!Number.isFinite(durationSec)) {
    return 0;
  }

  return Math.max(1, Math.round(Number(durationSec) / 60));
}

export function cloneTutorial(tutorial: TutorialResponse): TutorialResponse {
  return {
    ...tutorial,
    instructions: [...tutorial.instructions],
    tools: [...tutorial.tools],
    createdAt: new Date(tutorial.createdAt),
    updatedAt: new Date(tutorial.updatedAt)
  };
}

export function mapCurrentTutorial(tutorial: {
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
    category: normalizeTutorialCategory(tutorial.category),
    difficulty: normalizeTutorialDifficulty(tutorial.difficulty),
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

export function mapLegacyTutorial(row: LegacyTutorialRow): TutorialResponse {
  const createdAt = normalizeDate(row.createdAt);

  return {
    id: row.id,
    title: row.title,
    description: 'Tutoriel atelier disponible sur cette deployment legacy.',
    category: normalizeTutorialCategory(row.category),
    difficulty: normalizeTutorialDifficulty(row.difficulty),
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

export async function readTutorialCatalog() {
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

export function searchTutorialCatalog(tutorials: TutorialResponse[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return tutorials;
  }

  return tutorials.filter(tutorial =>
    tutorial.title.toLowerCase().includes(normalizedQuery) ||
    tutorial.description.toLowerCase().includes(normalizedQuery) ||
    tutorial.category.toLowerCase().includes(normalizedQuery) ||
    tutorial.difficulty.toLowerCase().includes(normalizedQuery) ||
    tutorial.instructions.some(instruction => instruction.toLowerCase().includes(normalizedQuery)) ||
    tutorial.tools.some(tool => tool.toLowerCase().includes(normalizedQuery))
  );
}
