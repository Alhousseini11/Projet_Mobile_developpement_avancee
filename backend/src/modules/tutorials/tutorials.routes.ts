import { Router } from 'express';
import * as controller from './tutorials.controller';

const router = Router();

router.get('/', controller.listTutorials);
router.post('/', controller.createTutorial);
router.get('/popular', controller.getPopularTutorials);
router.get('/top-rated', controller.getTopRatedTutorials);
router.get('/category/:category', controller.getTutorialsByCategory);
router.get('/:id', controller.getTutorialById);
router.put('/:id', controller.updateTutorial);
router.delete('/:id', controller.deleteTutorial);
router.post('/:id/views', controller.incrementTutorialViews);
router.post('/:id/rate', controller.rateTutorial);

export default router;
