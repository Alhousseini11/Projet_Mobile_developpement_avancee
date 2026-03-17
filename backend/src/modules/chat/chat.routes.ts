import { Router } from 'express';
import * as controller from './chat.controller';

const router = Router();

router.get('/', controller.listMessages);

export default router;
