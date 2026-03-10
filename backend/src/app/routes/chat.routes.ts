import { Router } from 'express';
import { listMessages } from '../controllers/chat.controller';

const router = Router();
router.get('/', listMessages);

export default router;
