import { Router } from 'express';
import { getDashboard } from '../controllers/dashboard_controller';

const router = Router();
router.get('/', getDashboard);
export default router;
