import { Router } from 'express';
import { listNotifications } from '../controllers/notifications.controller';

const router = Router();
router.get('/', listNotifications);

export default router;
