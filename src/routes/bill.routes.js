import {Router} from 'express';
 
const router = Router()
 
import * as billCtrl from '../controllers/bill.controller';
import { verifyToken, reCaptcha } from '../middlewares/authJwt';
 
router.post('/getBillBySubOrder', verifyToken, billCtrl.getOrderById);

export default  router;