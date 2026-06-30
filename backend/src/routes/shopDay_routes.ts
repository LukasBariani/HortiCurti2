import { Router } from "express";
import * as controller from "../controllers/shopDay_controller"
import { fsErrorMessage } from "@anthropic-ai/sdk/tools/agent-toolset/fs-util.mjs";
import { execFileSync } from "node:child_process";

const router = Router();

//post
router.post('/', controller.createShopDay);

//get
router.get('/', controller.getAllShopDay);
router.get('/:id', controller.getShopDayById);


//delete
router.delete('/:id', controller.deleteShopDay);



export default router;