import { Request, Response } from 'express';

export const placeholder = async (_req: Request, res: Response) => res.status(501).json({ message: 'home controller not implemented' });
