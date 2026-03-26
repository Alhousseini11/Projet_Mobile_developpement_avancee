import { Role } from '@prisma/client';
import { Router } from 'express';
import { authGuard } from '../../core/http/middleware/authGuard';
import { roleGuard } from '../../core/http/middleware/roleGuard';
import * as controller from './admin.controller';

const router = Router();

router.use(authGuard, roleGuard([Role.ADMIN]));

router.get('/summary', controller.getAdminSummary);
router.get('/users', controller.listAdminUsers);
router.get('/reservations', controller.listAdminReservations);
router.get('/services', controller.listAdminServices);
router.post('/services', controller.createAdminService);

export default router;
