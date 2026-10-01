import { Router } from "express";
import * as controller from "../controllers/client_controller"


const router = Router();

//post
router.post('/', controller.createClient);
router.patch('/:id/markup', controller.updateClientMarkup);
router.patch('/:id', controller.updateClient);

//gett
router.get('/', controller.getAllClients);
router.get('/:id/orders', controller.getClientOrders);
router.get('/:id', controller.getClientById);


//delete
router.delete('/:id', controller.deleteClient);



export default router;
