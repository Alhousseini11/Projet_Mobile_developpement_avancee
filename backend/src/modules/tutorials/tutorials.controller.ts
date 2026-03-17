import { Request, Response } from 'express';
import { prisma } from '../../data/prisma/client';

export async function listTutorials(_req: Request, res: Response) {
  const tutorials = await prisma.tutorial.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(tutorials);
}

export async function createTutorial(req: Request, res: Response) {
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
  res.status(201).json(tutorial);
}

export async function getTutorialById(req: Request, res: Response) {
  const { id } = req.params;
  const tutorial = await prisma.tutorial.findUnique({ where: { id } });
  if (!tutorial) return res.status(404).json({ message: 'Tutorial not found' });
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
    res.json(tutorial);
  } catch (err) {
    res.status(404).json({ message: 'Tutorial not found' });
  }
}

export async function deleteTutorial(req: Request, res: Response) {
  const { id } = req.params;
  try {
    await prisma.tutorial.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    res.status(404).json({ message: 'Tutorial not found' });
  }
}

export async function getTutorialsByCategory(req: Request, res: Response) {
  const { category } = req.params;
  const tutorials = await prisma.tutorial.findMany({
    where: { category: category as any },
    orderBy: { createdAt: 'desc' }
  });
  res.json(tutorials);
}

export async function getPopularTutorials(req: Request, res: Response) {
  const limit = Number(req.query.limit) || 5;
  const tutorials = await prisma.tutorial.findMany({
    orderBy: { views: 'desc' },
    take: limit
  });
  res.json(tutorials);
}

export async function getTopRatedTutorials(req: Request, res: Response) {
  const limit = Number(req.query.limit) || 5;
  const tutorials = await prisma.tutorial.findMany({
    orderBy: { rating: 'desc' },
    take: limit
  });
  res.json(tutorials);
}

export async function incrementTutorialViews(req: Request, res: Response) {
  const { id } = req.params;
  try {
    await prisma.tutorial.update({
      where: { id },
      data: { views: { increment: 1 } }
    });
    res.status(204).end();
  } catch (err) {
    res.status(404).json({ message: 'Tutorial not found' });
  }
}

export async function rateTutorial(req: Request, res: Response) {
  const { id } = req.params;
  const { rating } = req.body;
  try {
    const tutorial = await prisma.tutorial.update({
      where: { id },
      data: { rating }
    });
    res.json(tutorial);
  } catch (err) {
    res.status(404).json({ message: 'Tutorial not found' });
  }
}
