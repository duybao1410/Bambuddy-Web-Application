const multer = require("multer");
const path = require("path");

//Create storage
const createStorage = (uploadPath) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, `../../public/uploads/${uploadPath}`));
    },
    filename: (req, file, cb) => {
      // Sanitize filename: keep safe chars only
      const ext = path.extname(file.originalname).toLowerCase();
      const raw = path.basename(file.originalname, ext);
      const safe = raw
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      cb(null, `${safe}-${Date.now()}${ext}`);
    },
  });
};

const fileFilter = (req, file, cb) => {
  const allowed = [".jpg", ".jpeg", ".png"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true); // chấp nhận upload
  } else {
    cb(new Error("File allowed: " + allowed.join(", ")));
  }
};

module.exports = { createStorage, fileFilter };
