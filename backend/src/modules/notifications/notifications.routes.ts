import { Router } from 'express';
import * as controller from './notifications.controller';

const router = Router();

router.get('/', controller.listNotifications);

export default router;
