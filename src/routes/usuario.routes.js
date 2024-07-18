import { Router } from 'express';

const router = Router()

import * as authCtrl from '../controllers/usuario.controller';
import { verifySignup } from '../middlewares';
import { verifyToken, validarJwtToRefresh } from '../middlewares/authJwt';

router.post('/signup', [verifySignup.checkDuplicatedUsername, verifySignup.checkRolesExisted], authCtrl.signUp);
router.post('/signin', authCtrl.signIn);
router.post('/signin-email', authCtrl.signInEmail);
router.get('/renew', validarJwtToRefresh, authCtrl.revalidarToken);
router.post('/send-email', authCtrl.sendPasswordEmail);
router.post('/new-password', verifyToken, authCtrl.updatePassword);
router.post('/update-status', verifyToken, authCtrl.updateStatus);

export default router;
