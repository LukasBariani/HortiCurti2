import { Router } from "express";
import * as controller from "../controllers/shopDay_controller"


const router = Router();

//post
router.post('/', controller.createShopDay);

//get
router.get('/', controller.getAllShopDay);
router.get('/:id', controller.getShopDayById);


//delete
router.delete('/:id', controller.deleteShopDay);



export default router;