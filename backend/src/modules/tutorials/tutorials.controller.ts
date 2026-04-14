import { Request, Response } from 'express';
import { logger } from '../../config/logger';
import { prisma } from '../../data/prisma/client';
import { AppError } from '../../shared/errors';
import { resolveOptionalRequestUser } from '../auth/auth.service';
import {
  cloneTutorial,
  ensureStringArray,
  mapCurrentTutorial,
  mapLegacyTutorial,
  normalizeDate,
  normalizeDuration,
  normalizeDurationFromSeconds,
  readTutorialCatalog,
  searchTutorialCatalog
} from './tutorials.catalog';
import {
  buildTutorialCreateData,
  buildTutorialUpdateData,
  isPrismaRecordNotFoundError,
  isPrismaValidationError,
  normalizeTutorialCategory,
  normalizeTutorialDifficulty,
  normalizeTutorialRating,
  normalizeTutorialWritePayload,
  shouldCountQualifiedTutorialView
} from './tutorials.normalization';
import {
  areSameManagedTutorialVideoUrl,
  removeManagedTutorialVideoByUrl
} from './tutorialMedia';

export async function listTutorials(_req: Request, res: Response) {
  res.json(await readTutorialCatalog());
}

export async function searchTutorials(req: Request, res: Response) {
  const tutorials = await readTutorialCatalog();
  const query = typeof req.query.q === 'string' ? req.query.q : '';
  res.json(searchTutorialCatalog(tutorials, query));
}

export async function createTutorial(req: Request, res: Response) {
  try {
    const payload = normalizeTutorialWritePayload(req.body);
    const tutorial = await prisma.tutorial.create({
      data: buildTutorialCreateData(payload)
    });

    res.status(201).json(mapCurrentTutorial({
      ...tutorial,
      category: String(tutorial.category),
      difficulty: String(tutorial.difficulty)
    }));
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.status).json({ message: error.message });
      return;
    }

    if (isPrismaValidationError(error)) {
      res.status(400).json({ message: 'Les donnees du tutoriel sont invalides.' });
      return;
    }

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

  try {
    const existingTutorial = await prisma.tutorial.findUnique({
      where: { id },
      select: { videoUrl: true }
    });

    if (!existingTutorial) {
      res.status(404).json({ message: 'Tutorial not found' });
      return;
    }

    const payload = normalizeTutorialWritePayload(req.body);
    const tutorial = await prisma.tutorial.update({
      where: { id },
      data: buildTutorialUpdateData(payload)
    });

    if (
      existingTutorial.videoUrl &&
      !areSameManagedTutorialVideoUrl(existingTutorial.videoUrl, tutorial.videoUrl)
    ) {
      try {
        await removeManagedTutorialVideoByUrl(existingTutorial.videoUrl);
      } catch (cleanupError) {
        logger.warn(
          { err: cleanupError, tutorialId: id, videoUrl: existingTutorial.videoUrl },
          'Unable to cleanup previous tutorial video after update'
        );
      }
    }

    res.json(mapCurrentTutorial({
      ...tutorial,
      category: String(tutorial.category),
      difficulty: String(tutorial.difficulty)
    }));
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.status).json({ message: error.message });
      return;
    }

    if (isPrismaValidationError(error)) {
      res.status(400).json({ message: 'Les donnees du tutoriel sont invalides.' });
      return;
    }

    if (isPrismaRecordNotFoundError(error)) {
      res.status(404).json({ message: 'Tutorial not found' });
      return;
    }

    logger.error({ err: error, tutorialId: id }, 'Error updating tutorial');
    res.status(503).json({ message: 'Tutorial write operations are not available on this deployment.' });
  }
}

export async function deleteTutorial(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const existingTutorial = await prisma.tutorial.findUnique({
      where: { id },
      select: { videoUrl: true }
    });

    if (!existingTutorial) {
      res.status(404).json({ message: 'Tutorial not found' });
      return;
    }

    await prisma.tutorial.delete({ where: { id } });

    if (existingTutorial.videoUrl) {
      try {
        await removeManagedTutorialVideoByUrl(existingTutorial.videoUrl);
      } catch (cleanupError) {
        logger.warn(
          { err: cleanupError, tutorialId: id, videoUrl: existingTutorial.videoUrl },
          'Unable to cleanup tutorial video after delete'
        );
      }
    }

    res.status(204).end();
  } catch (error) {
    if (isPrismaRecordNotFoundError(error)) {
      res.status(404).json({ message: 'Tutorial not found' });
      return;
    }

    logger.error({ err: error, tutorialId: id }, 'Error deleting tutorial');
    res.status(503).json({ message: 'Tutorial delete is not available on this deployment.' });
  }
}

export async function getTutorialsByCategory(req: Request, res: Response) {
  const tutorials = await readTutorialCatalog();
  res.json(
    tutorials.filter(tutorial => tutorial.category === normalizeTutorialCategory(req.params.category))
  );
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
  const authUser = await resolveOptionalRequestUser(req);

  if (!authUser?.id) {
    res.status(204).end();
    return;
  }

  const viewedAt = new Date();

  try {
    await prisma.$transaction(async tx => {
      const tutorial = await tx.tutorial.findUnique({
        where: { id },
        select: { id: true }
      });

      if (!tutorial) {
        return;
      }

      const existingView = await tx.tutorialView.findUnique({
        where: {
          userId_tutorialId: {
            userId: authUser.id,
            tutorialId: id
          }
        },
        select: { lastViewedAt: true }
      });

      if (!shouldCountQualifiedTutorialView(existingView?.lastViewedAt, viewedAt)) {
        return;
      }

      if (existingView) {
        await tx.tutorialView.update({
          where: {
            userId_tutorialId: {
              userId: authUser.id,
              tutorialId: id
            }
          },
          data: { lastViewedAt: viewedAt }
        });
      } else {
        await tx.tutorialView.create({
          data: {
            userId: authUser.id,
            tutorialId: id,
            lastViewedAt: viewedAt
          }
        });
      }

      await tx.tutorial.update({
        where: { id },
        data: { views: { increment: 1 } }
      });
    });
  } catch (error) {
    logger.warn({ err: error, tutorialId: id, userId: authUser.id }, 'Tutorial views increment skipped');
  }

  res.status(204).end();
}

export async function rateTutorial(req: Request, res: Response) {
  const { id } = req.params;
  const authUser = await resolveOptionalRequestUser(req);

  if (!authUser?.id) {
    res.status(401).json({ message: 'Authentification requise.' });
    return;
  }

  try {
    const rating = normalizeTutorialRating(req.body?.rating);
    const existingTutorial = await prisma.tutorial.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existingTutorial) {
      res.status(404).json({ message: 'Tutorial not found' });
      return;
    }

    await prisma.tutorialRating.upsert({
      where: {
        userId_tutorialId: {
          userId: authUser.id,
          tutorialId: id
        }
      },
      update: {
        rating
      },
      create: {
        userId: authUser.id,
        tutorialId: id,
        rating
      }
    });

    const aggregate = await prisma.tutorialRating.aggregate({
      where: { tutorialId: id },
      _avg: { rating: true }
    });

    const averageRating = Number((aggregate._avg.rating ?? 0).toFixed(1));
    const tutorial = await prisma.tutorial.update({
      where: { id },
      data: { rating: averageRating }
    });

    res.json(mapCurrentTutorial({
      ...tutorial,
      category: String(tutorial.category),
      difficulty: String(tutorial.difficulty)
    }));
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.status).json({ message: error.message });
      return;
    }

    logger.error({ err: error, tutorialId: id }, 'Error rating tutorial');
    res.status(503).json({ message: 'Tutorial rating is not available on this deployment.' });
  }
}

export const __tutorialControllerInternals = {
  normalizeDate,
  ensureStringArray,
  normalizeCategory: normalizeTutorialCategory,
  normalizeDifficulty: normalizeTutorialDifficulty,
  normalizeDuration,
  normalizeDurationFromSeconds,
  normalizeTutorialRating,
  normalizeTutorialWritePayload,
  shouldCountQualifiedTutorialView,
  cloneTutorial,
  mapCurrentTutorial,
  mapLegacyTutorial
};
