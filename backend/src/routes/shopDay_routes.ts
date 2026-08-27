import { Router } from 'express';
import * as controller from '../controllers/shopDay_controller';
const router = Router();

//post
router.post('/', controller.createShopDay);

//get
router.get('/', controller.getAllShopDay);
router.get('/:id', controller.getShopDayById);

//delete
router.delete('/:id', controller.deleteShopDay);

//pega lista consolidada do dia de hoje
router.get('/consolidated/today', controller.getTodayConsolidatedList);

export default router;
