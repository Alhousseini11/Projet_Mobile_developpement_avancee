import { Router } from 'express';
import * as controller from './reservations.controller';

const router = Router();

router.get('/services', controller.listReservationServices);
router.get('/slots', controller.listAvailableSlots);
router.get('/', controller.listReservations);
router.post('/', controller.createReservation);
router.get('/:id', controller.getReservationById);
router.patch('/:id', controller.updateReservation);
router.post('/:id/photos', controller.uploadReservationPhoto);
router.post('/:id/pay', controller.payReservation);

export default router;
