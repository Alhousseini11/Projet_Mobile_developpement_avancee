import { Request, Response } from 'express';

export const register = async (_req: Request, res: Response) => res.status(501).json({ message: 'register not implemented' });
export const login = async (_req: Request, res: Response) => res.status(501).json({ message: 'login not implemented' });
export const refresh = async (_req: Request, res: Response) => res.status(501).json({ message: 'refresh not implemented' });
export const forgotPassword = async (_req: Request, res: Response) => res.status(501).json({ message: 'forgot password not implemented' });
export const resetPassword = async (_req: Request, res: Response) => res.status(501).json({ message: 'reset password not implemented' });
