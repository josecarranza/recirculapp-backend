import { Router } from "express";

const router = Router();
const multer = require("multer");
import * as companyCtrl from "../controllers/company.controller";
import { verifyToken } from "../middlewares/authJwt";

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

/******************** GET ROUTES ********************/
router.get("/getCompanies", verifyToken, companyCtrl.getAllCompanies);
router.get(
  "/getCompaniesPendingValidation",
  verifyToken,
  companyCtrl.getCompaniesPendingValidation
);

router.get(
  "/getLatestCompanies",
  verifyToken,
  companyCtrl.getLatestCompanies
);

router.get("/getCompaniesActive", verifyToken, companyCtrl.getCompaniesActive);

/******************** POST ROUTES ********************/
router.post(
  "/register",

  // companyCtrl.registerCompany
  companyCtrl.registerAndApproveCompany
);


router.post("/getCompanyByUser", verifyToken, companyCtrl.getCompanyByUser);
router.post("/approve", verifyToken,
  // companyCtrl.approveCompany
  companyCtrl.changeCompanyStatus
);
router.post("/update", verifyToken, companyCtrl.editCompany);
router.post("/send-password", verifyToken, companyCtrl.sendPasswordCompany);

export default router;
