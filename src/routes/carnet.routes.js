import {Router} from 'express';

const router = Router()

import * as carnetCtrl from '../controllers/carnet.controller';
import { verifyToken } from '../middlewares/authJwt';

router.post('/generar-carnet', verifyToken, carnetCtrl.GenerarCarnetRecolector);

export default  router;
