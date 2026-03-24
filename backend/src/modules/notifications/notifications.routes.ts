import { Router } from 'express';
import { authGuard } from '../../core/http/middleware/authGuard';
import * as controller from './notifications.controller';

const router = Router();

router.get('/', authGuard, controller.listNotifications);

export default router;
