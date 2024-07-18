import {Router} from 'express';
 
const router = Router()
 
import * as payCtrl from '../controllers/payments.controller';
import { verifyToken, reCaptcha } from '../middlewares/authJwt';
 
router.post('/payment',[verifyToken], payCtrl.payment);
router.post('/bill', payCtrl.sendBill);
router.post('/setPaymentData',[verifyToken], payCtrl.setPaymentData);

export default  router;