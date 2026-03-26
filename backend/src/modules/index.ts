import { Express } from 'express';
import authRoutes from './auth/auth.routes';
import reservationsRoutes from './reservations/reservations.routes';
import tutorialsRoutes from './tutorials/tutorials.routes';
import vehiclesRoutes from './vehicles/vehicles.routes';
import profileRoutes from './profile/profile.routes';
import chatRoutes from './chat/chat.routes';
import reviewsRoutes from './reviews/reviews.routes';
import notificationsRoutes from './notifications/notifications.routes';
import locationRoutes from './location/location.routes';
import estimationRoutes from './estimation/estimation.routes';
import emergencyRoutes from './emergency/emergency.routes';
import homeRoutes from './home/home.routes';
import adminRoutes from './admin/admin.routes';

export function registerRoutes(app: Express) {
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/reservations', reservationsRoutes);
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
