import { Router } from "express";
const multer = require("multer");
const router = Router();

import * as subCategoryCtrl from "../controllers/subcategory.controller";
import { verifySignup } from "../middlewares";
import { verifyToken } from "../middlewares/authJwt";

const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
};

const storageProfile = multer.diskStorage({
  destination: (req, file, callback) => {
    console.log("Holi");
    console.log("Holi");
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
    callback(null, `category-${name}.${ext}`);
  },
});

router.post("/create", verifyToken, subCategoryCtrl.createSubCategory);
router.post(
  "/update",
  [verifyToken, multer({ storage: storageProfile }).single("file")],
  verifyToken,
  subCategoryCtrl.editSubCategory
);
router.get("/getsubcategories", verifyToken, subCategoryCtrl.subGetCategorias);
router.post(
  "/getsubcategoriesbycategory",
  verifyToken,
  subCategoryCtrl.getSubCategoriasByCategory
);
router.post("/getsinglesubcategory", subCategoryCtrl.getSingleSubCategory);
router.post(
  "/change-status",
  verifyToken,
  subCategoryCtrl.changeStateSubcategory
);

export default router;
