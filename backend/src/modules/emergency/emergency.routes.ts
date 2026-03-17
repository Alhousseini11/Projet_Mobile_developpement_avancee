import { Router } from 'express';
import * as controller from './emergency.controller';

const router = Router();

router.get('/', controller.getEmergencyHelp);

export default router;
