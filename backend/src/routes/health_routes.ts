import { Router } from 'express';
import { health } from '../controllers/health_controller';

const router = Router();
router.get('/', health);

export default router;
