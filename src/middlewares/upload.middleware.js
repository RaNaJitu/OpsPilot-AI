const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const { BadRequestError } = require("../utils/error");
const { config } = require("../config");
const logger = require("../config/logger");

const uploadDir = path.join(__dirname, "../uploads/incidents");

const ALLOWED_EXTENSIONS = [
  ".log",
  ".txt",
  ".json",
];

// Browsers often send octet-stream / empty type for .log files
const ALLOWED_MIME_TYPES = [
  "text/plain",
  "application/json",
  "application/octet-stream",
  "",
];

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },

  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const fileName = `incident_${Date.now()}_${crypto.randomUUID()}${ext}`;
    cb(null, fileName);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).trim().toLowerCase();
  const mimeType = (file.mimetype || "").toLowerCase();

  logger.info("Middleware: Upload: File type check", {
    file: file.originalname,
    ext,
    mimeType,
  });

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    logger.warn("Middleware: Upload: Invalid file extension", {
      file: file.originalname,
      mimeType,
      reason: "Invalid file extension",
    });
    return cb(
      new BadRequestError(
        `Only ${ALLOWED_EXTENSIONS.join(", ")} files up to ${Math.round(config.MAX_UPLOAD_SIZE / (1024 * 1024))} MB are supported.`,
        "INVALID_FILE_TYPE"
      )
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    logger.warn("Middleware: Upload: Invalid file mime type", {
      file: file.originalname,
      mimeType,
      reason: "Invalid file type",
    });
    return cb(
      new BadRequestError(
        `Only ${ALLOWED_EXTENSIONS.join(", ")} files up to ${Math.round(config.MAX_UPLOAD_SIZE / (1024 * 1024))} MB are supported.`,
        "INVALID_FILE_TYPE"
      )
    );
  }

  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.MAX_UPLOAD_SIZE,
  },
});

module.exports = {
  single: (fieldName = "file") => upload.single(fieldName),
  array: (fieldName = "files", maxCount = 10) =>
    upload.array(fieldName, maxCount),
};
