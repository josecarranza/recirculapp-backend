import { Router } from "express";
const multer = require("multer");

const router = Router();

import * as categoryCtrl from "../controllers/category.controller";
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
    callback(null, `category-${name}.${ext}`);
  },
});

router.post("/create", verifyToken, categoryCtrl.createCategory);
router.post(
  "/update",
  [verifyToken, multer({ storage: storageProfile }).single("file")],
  categoryCtrl.editCategory
);
router.get("/getcategories", verifyToken, categoryCtrl.geCategorias);
router.post("/change-state", verifyToken, categoryCtrl.changeStateCategory);
router.post(
  "/getcategorywithsubcategory",
  verifyToken,
  categoryCtrl.getCategoryWithSubcategories
);

export default router;
