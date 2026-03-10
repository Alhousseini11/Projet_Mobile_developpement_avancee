import { Express } from 'express';
import authRoutes from './auth.routes';
import reservationsRoutes from './reservations.routes';
import paymentsRoutes from './payments.routes';
import tutorialsRoutes from './tutorials.routes';
import vehiclesRoutes from './vehicles.routes';
import profileRoutes from './profile.routes';
import chatRoutes from './chat.routes';
import reviewsRoutes from './reviews.routes';
import notificationsRoutes from './notifications.routes';
import locationRoutes from './location.routes';
import estimationRoutes from './estimation.routes';
import emergencyRoutes from './emergency.routes';
import homeRoutes from './home.routes';

export function registerRoutes(app: Express) {
  app.use('/api/auth', authRoutes);
  app.use('/api/reservations', reservationsRoutes);
  app.use('/api/payments', paymentsRoutes);
  app.use('/api/tutorials', tutorialsRoutes);
  app.use('/api/vehicles', vehiclesRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/reviews', reviewsRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/location', locationRoutes);
  app.use('/api/estimation', estimationRoutes);
  app.use('/api/emergency', emergencyRoutes);
  app.use('/api/home', homeRoutes);
}
