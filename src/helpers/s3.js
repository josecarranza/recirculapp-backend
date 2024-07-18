const S3 = require("aws-sdk/clients/s3");
const fs = require("fs");

const region = "us-east-2";
const accessKeyId = "AKIA5YH4YGO5R3SHTDGV";
const secretAccessKey = "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";

// Validate credentials
if (!accessKeyId || !secretAccessKey) {
  console.error("AWS credentials not found.");
  process.exit(1);
}

const storage = new S3({
  region,
  accessKeyId,
  secretAccessKey,
});

const getBuckets = () => {
  return storage.listBuckets().promise();
};

const uploadToBucket = (bucketName, file) => {
  const stream = fs.createReadStream(file.tempFilePath);
  const params = {
    Bucket: bucketName,
    Key: file.name,
    Body: stream,
  };
  return storage.upload(params).promise();
};

const uploadBill = (bucketName, pfdPath, key) => {
  const stream = fs.createReadStream(pfdPath);
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: stream,
    ContentType: "application/pdf",
  };
  // We need to check if the stream is not empty before uploading
  if (stream) {
    return storage.upload(params).promise();
  } else {
    return "Something went wrong"; // TODO: Handle this error
  }
};

module.exports = {
  getBuckets,
  uploadBill,
  uploadToBucket,
};
