import { Router } from 'express';
import { putPricing } from '../controllers/orderItem_controller';

const router = Router();
router.put('/:id/pricing', putPricing);
export default router;
