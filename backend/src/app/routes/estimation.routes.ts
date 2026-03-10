import { Router } from 'express';
import { estimate } from '../controllers/estimation.controller';

const router = Router();
router.get('/', estimate);

export default router;
