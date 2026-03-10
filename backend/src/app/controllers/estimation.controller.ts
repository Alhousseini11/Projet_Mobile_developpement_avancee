import { Request, Response } from 'express';

export const estimate = async (req: Request, res: Response) => {
  const { serviceType, mileage } = req.query;
  // Simple heuristic placeholder
  const base = 50;
  const serviceFactor = serviceType ? String(serviceType).length * 2 : 10;
  const mileageFactor = mileage ? Math.min(Number(mileage) / 1000, 100) : 0;
  const estimated = Math.round(base + serviceFactor + mileageFactor);
  res.json({ estimated, currency: 'USD', serviceType: serviceType || 'generic' });
};
