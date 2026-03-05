import { Router } from 'express';
import * as controller from '../controllers/reservations.controller';

const router = Router();
router.get('/', controller.placeholder);
router.post('/', controller.placeholder);
router.get('/:id', controller.placeholder);
router.patch('/:id', controller.placeholder);
router.post('/:id/photos', controller.placeholder);
router.post('/:id/pay', controller.placeholder);
export default router;
