import { Router } from 'express';
import { authGuard } from '../../core/http/middleware/authGuard';
import * as controller from './reviews.controller';

const router = Router();

router.use(authGuard);
router.get('/', controller.listReviews);
router.post('/', controller.upsertReview);

export default router;
