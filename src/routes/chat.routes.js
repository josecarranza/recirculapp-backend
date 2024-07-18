import {Router} from 'express';

const router = Router()

import * as chatCtrl from '../controllers/chat.controller';

router.post('/login', chatCtrl.LoginUsuario);
router.post('/signup', chatCtrl.RegistrarUsuario);

export default  router;
