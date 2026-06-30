import { Router } from 'express';
import * as controller from '../controllers/rawMessage_controller';

const router = Router();

//post
router.post('/', controller.getRawMessage);

export default router;
