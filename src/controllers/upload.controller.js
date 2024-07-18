const { uploadToBucket } = require("../helpers/s3.helper");

const MAX_IMAGES = 5;

const upload = async (req, res) => {
  const bucketName = req.body.bucket;
  const files = req.file;

  // Check if the file is an array of files
  if (!Array.isArray(files)) {
    // Single file upload
    const file = files;
    const imageUrl = await uploadImage(bucketName, file);
    return res.json({
      ok: true,
      imageUrl: imageUrl,
    });
  }

  // Multiple files upload
  const imageUrls = [];
  if (files.length > MAX_IMAGES) {
    return res.status(400).json({
      ok: false,
      message: `You can only upload a maximum of ${MAX_IMAGES} images`,
    });
  }

  for (const file of files) {
    if (!file) {
      return res.status(400).json({
        ok: false,
        message: "No file uploaded",
      });
    }
    if (!file.mimetype.includes("image")) {
      return res.status(400).json({
        ok: false,
        message: "Only image files are allowed",
      });
    }
    const imageUrl = await uploadImage(bucketName, file);
    imageUrls.push(imageUrl);
  }
  return res.json({
    ok: true,
    imageUrls: imageUrls,
  });
};

async function uploadImage(bucketName, file) {
  const result = await uploadToBucket(bucketName, file);
  return result.Location;
}

module.exports = {
  upload,
};
