import { Router } from "express";

const router = Router();

import * as wasteCtrl from "../controllers/waste.controller";
import { verifySignup } from "../middlewares";
import { verifyToken } from "../middlewares/authJwt";

router.post("/create", wasteCtrl.createWaste);
router.get("/getwastes", wasteCtrl.getWastes);

export default router;
