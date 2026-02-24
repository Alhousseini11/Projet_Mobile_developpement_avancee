import { Router } from 'express';
import { listReviews } from '../controllers/reviews.controller';

const router = Router();
router.get('/', listReviews);

export default router;
