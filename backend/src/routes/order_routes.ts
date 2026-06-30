import { Router } from "express";
import * as controller from "../controllers/order_controller"


const router = Router();

//post
router.post('/', controller.createOrder);

//gett
router.get('/', controller.getAllOrders);
router.get('/:id', controller.getOrderById);


//delete
router.delete('/:id', controller.deleteOrder);



export default router;