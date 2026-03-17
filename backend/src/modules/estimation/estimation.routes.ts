import { Router } from 'express';
import * as controller from './estimation.controller';

const router = Router();

router.get('/', controller.getEstimation);

export default router;
