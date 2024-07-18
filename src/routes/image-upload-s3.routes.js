const { Router } = require("express");
const { upload } = require("../controllers/upload.controller");
const { verifyFile } = require("../middlewares/verifyFile");
const router = Router();
const multer = require("multer");

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
    callback(null, `${name}.${ext}`);
  },
});


router.post("/", [multer({ storage: storageProfile }).single("file")], upload);

module.exports = router;
