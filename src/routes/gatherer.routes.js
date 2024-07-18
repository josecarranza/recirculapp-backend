import {Router} from 'express';
const multer = require("multer");
const router = Router()

import * as gathererCtrl from '../controllers/gatherer.controller';
import {verifySignup} from '../middlewares';
import { verifyToken } from '../middlewares/authJwt';

const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
};

const storageProfile = multer.diskStorage({
  destination: (req, file, callback) => {
    const isValid = MIME_TYPE_MAP[file.mimetype];
    let error = new Error("Invalid Mime Type");
    if (isValid) {
      error = null;
    }

    callback(error, __dirname + "../../images");
  },
  filename: (req, file, callback) => {
    const name = file.originalname.toLowerCase().split(" ").join("-");
    const ext = MIME_TYPE_MAP[file.mimetype];
    callback(null, `recolector-dui-${name}.${ext}`);
  },
});

router.post('/register',   [multer({ storage: storageProfile }).single("file")], gathererCtrl.registerGatherer);
router.post('/update', gathererCtrl.editGatherer);
router.get('/getgatherer', verifyToken, gathererCtrl.getAllGatherer);
router.get('/getGathererPendingValidation', verifyToken, gathererCtrl.getGathererPendingValidation);
router.get('/getGathererActive', verifyToken, gathererCtrl.getGathererOnline);
router.post('/approve', verifyToken,  gathererCtrl.approveGatherer);
router.post('/send-password', verifyToken, gathererCtrl.sendPasswordGatherer);
router.post('/getGathererUser', verifyToken, gathererCtrl.getGathererByUser);


export default  router;
