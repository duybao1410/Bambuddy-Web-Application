const multer = require("multer");
const { createStorage, fileFilter } = require("../config/upload");

//Profile Photo
const rawUploadProfilePhoto = multer({
  storage: createStorage("profilePicture"),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: fileFilter,
}).single("profilePhoto");

// Wrapper to return clean error for oversize or invalid file
const uploadProfilePhoto = (req, res, next) => {
  rawUploadProfilePhoto(req, res, (err) => {
    if (err) {
      // Check if it's an AJAX request
      if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, error: 'Image must be ≤ 2MB' });
        }
        return res.status(400).json({ success: false, error: err.message || 'Invalid file upload' });
      }
      // Regular form submission - render page with error
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).render('dashboard/user/profile', { 
          user: req.user, 
          profile: req.user, 
          error: 'Image must be ≤ 2MB' 
        });
      }
      return res.status(400).render('dashboard/user/profile', { 
        user: req.user, 
        profile: req.user, 
        error: err.message || 'Invalid file upload' 
      });
    }
    next();
  });
};

//Tour Photos
const uploadTourPhotos = multer({
  storage: createStorage("tours"),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },
  fileFilter: fileFilter,
}).array("tourPhotos");

//Thread Photos
const uploadThreadPhotos = multer({
  storage: createStorage("threads"),
  limits: {
    fileSize: 3 * 1024 * 1024,
    files: 5,
  },
  fileFilter: fileFilter,
}).array("threadPhotos");

//Post Photos
const uploadPostPhotos = multer({
  storage: createStorage("posts"),
  limits: {
    fileSize: 3 * 1024 * 1024,
  },
  fileFilter: fileFilter,
}).single("postPhotos");

//Certificate Photos
const uploadCertificate = multer({
  storage: createStorage("certification"),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter,
}).single("certification");

module.exports = {
  uploadProfilePhoto,
  uploadTourPhotos,
  uploadThreadPhotos,
  uploadPostPhotos,
  uploadCertificate,
};
