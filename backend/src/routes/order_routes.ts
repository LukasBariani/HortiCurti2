import { Router } from 'express';
import * as controller from '../controllers/order_controller';

const router = Router();

// post
router.post('/', controller.createOrder);

// get
router.get('/', controller.getAllOrders);

router.get('/today', controller.getTodayOrders);

// delete
router.delete('/:id', controller.deleteOrder);

export default router;
