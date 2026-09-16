import { Router } from 'express';
import * as controller from '../controllers/order_controller';

const router = Router();

// post
router.post('/', controller.createOrder);

// get
router.get('/', controller.getAllOrders);

router.get('/today', controller.getTodayOrders);
router.get('/delivery', controller.getOrdersByDeliveryDate);
router.get('/:id', controller.getOrderById);
router.patch('/:id/deliver', controller.deliverOrder);
router.patch('/:id/status', controller.patchStatus);
router.patch('/:id', controller.patchOrder);

// delete
router.delete('/:id', controller.deleteOrder);

export default router;
