const verifyFile = (req, res, next) => {
  console.log(req.files.file)
  console.log(req.files)
  if (!req.file || Object.keys(req.file).length === 0 || !req.files.file) {
    return res.status(400).json({ msg: 'No files were uploaded' });
  }

  next();
};

module.exports = {
  verifyFile
};