import { Router } from 'express';
import * as controller from './location.controller';

const router = Router();

router.get('/', controller.listLocations);

export default router;
