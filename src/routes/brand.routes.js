import { Router } from 'express';

const router = Router()

import * as branchCtrl from '../controllers/branch.controller';
import { verifySignup } from '../middlewares';
import { verifyToken } from '../middlewares/authJwt';

router.post('/register', verifyToken,
    // branchCtrl.registerBrand
    branchCtrl.registerAndApproveBrand
);
router.post('/approve', verifyToken,
    branchCtrl.approveBrand);
router.post('/getBrandPendingValidation', verifyToken, branchCtrl.getBrandPendingValidation);
router.post('/getBrandActive', verifyToken, branchCtrl.getBrandActive);
router.post('/getBranchByUser', verifyToken, branchCtrl.getBrandByUser);
router.post('/getbrandsbycompany', verifyToken, branchCtrl.getBransComapny);
router.post('/update', verifyToken, branchCtrl.editarBranch);
//asignarZona 
router.post('/asignarZona', verifyToken, branchCtrl.asignarZona);

export default router;