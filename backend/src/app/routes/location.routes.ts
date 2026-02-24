import { Router } from 'express';
import { listLocations } from '../controllers/location.controller';

const router = Router();
router.get('/', listLocations);

export default router;
