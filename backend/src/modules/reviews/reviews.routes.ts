import { Router } from 'express';
import * as controller from './reviews.controller';

const router = Router();

router.get('/', controller.listReviews);

export default router;
