import { Router } from 'express';
import { emergencyContacts } from '../controllers/emergency.controller';

const router = Router();
router.get('/', emergencyContacts);

export default router;
