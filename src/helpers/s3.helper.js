const S3 = require("aws-sdk/clients/s3");
const fs = require("fs");

const region = "us-east-2";
const accessKeyId = "AKIA5YH4YGO5R3SHTDGV";
const secretAccessKey = "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";
const bucketName = "filemanagerrecir";

const storage = new S3({
  region,
  accessKeyId,
  secretAccessKey,
});

const getBuckets = () => {
  return storage.listBuckets().promise();
};

const uploadToBucket = (bucketName, file, newName) => {
  const stream = fs.createReadStream(file.path);
  // const static = fs.statSync(file.tempFilePath);
  const params = {
    Bucket: bucketName,
    Key: newName ? newName : file.filename,
    Body: stream,
    ContentType: file.mimetype,
  };
  return storage.upload(params).promise();
};


const uploadToBucket2 = async (bucketName, file, newName) => {
  const stream = fs.createReadStream(file.path);

  try {
    const params = {
      Bucket: bucketName,
      Key: newName || file.filename,
      Body: stream,
      ContentType: file.mimetype,
    };

    const uploadResult = await storage.upload(params).promise();
    return ("File uploaded successfully", uploadResult);
  } catch (error) {
    throw new Error(`Failed to upload file to bucket: ${error.message}`);
  } finally {
    // Close the file stream
    stream.close();
  }
};

// Upload file to AWS S3 bucket
const uploadToBucketExcelFile = async (buffer, nameFile) => {
  const region = "us-east-2";
  const accessKeyId = "AKIA5YH4YGO5R3SHTDGV";
  const secretAccessKey = "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";

  // Initialize S3 client
  const storage = new S3({
    region,
    accessKeyId,
    secretAccessKey
  });

  // Configure S3 upload parameters
  const params = {
    Bucket: 'filemanagerrecir',
    Key: nameFile,
    Body: buffer,
    ACL: 'public-read',
    ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };

  // Upload file to S3 bucket
  const { Location } = await storage.upload(params).promise();

  return Location;

};

const deleteFiles = (bucketName, files) => {
  const deleteParam = {
    Bucket: bucketName,
    Delete: {
      Objects: files,
    },
  };

  return storage.deleteObjects(deleteParam).promise();
};

const deleteExcelFile = (files) => {
  const deleteParam = {
    Bucket: bucketName,
    Delete: {
      Objects: files,
    },
  };

  return storage.deleteObjects(deleteParam).promise();
};

module.exports = {
  getBuckets,
  uploadToBucket,
  uploadToBucket2,
  deleteFiles,
  uploadToBucketExcelFile,
  deleteExcelFile,
  storage
};
