import { Router } from 'express';
import * as controller from '../controllers/home.controller';

const router = Router();
router.get('/', controller.placeholder);
export default router;
