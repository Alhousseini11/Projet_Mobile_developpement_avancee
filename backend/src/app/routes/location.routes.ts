import { Router } from 'express';
import * as controller from '../controllers/location.controller';

const router = Router();
router.get('/', controller.placeholder);
export default router;
