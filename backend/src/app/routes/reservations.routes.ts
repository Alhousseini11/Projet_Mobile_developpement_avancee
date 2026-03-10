import { Router } from 'express';
import {
  listReservations,
  createReservation,
  getReservation,
  updateReservation,
  addReservationPhoto,
  payReservation,
} from '../controllers/reservations.controller';

const router = Router();
router.get('/', listReservations);
router.post('/', createReservation);
router.get('/:id', getReservation);
router.patch('/:id', updateReservation);
router.post('/:id/photos', addReservationPhoto);
router.post('/:id/pay', payReservation);

export default router;
