import { Router } from 'express';
import { listTutorials } from '../controllers/tutorials.controller';

const router = Router();
router.get('/', listTutorials);

export default router;
