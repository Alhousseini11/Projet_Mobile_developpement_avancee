import { Role } from '@prisma/client';
import { Router } from 'express';
import { authGuard } from '../../core/http/middleware/authGuard';
import { roleGuard } from '../../core/http/middleware/roleGuard';
import * as controller from './tutorials.controller';

const router = Router();

router.get('/', controller.listTutorials);
router.get('/popular', controller.getPopularTutorials);
router.get('/top-rated', controller.getTopRatedTutorials);
router.get('/category/:category', controller.getTutorialsByCategory);
router.get('/:id', controller.getTutorialById);
router.post('/:id/views', controller.incrementTutorialViews);
router.post('/:id/rate', authGuard, controller.rateTutorial);
router.post('/', authGuard, roleGuard([Role.ADMIN]), controller.createTutorial);
router.put('/:id', authGuard, roleGuard([Role.ADMIN]), controller.updateTutorial);
router.delete('/:id', authGuard, roleGuard([Role.ADMIN]), controller.deleteTutorial);

export default router;
