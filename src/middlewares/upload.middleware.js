const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const { BadRequestError } = require("../utils/error");
const { config } = require("../config");
const logger = require("../config/logger");

const uploadDir = path.resolve(__dirname, "../uploads/incidents");

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

const isSafeOriginalName = (name) => {
  if (!name || typeof name !== "string") return false;
  if (name.includes("\0")) return false;
  if (name.includes("..") || name.includes("/") || name.includes("\\")) {
    return false;
  }
  return true;
};

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
  if (!isSafeOriginalName(file.originalname)) {
    return cb(new BadRequestError("Invalid file name.", "INVALID_FILE_NAME"));
  }

  const ext = path.extname(file.originalname).trim().toLowerCase();
  const mimeType = (file.mimetype || "").toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    logger.warn("Upload rejected: invalid extension", { ext });
    return cb(
      new BadRequestError(
        `Only ${ALLOWED_EXTENSIONS.join(", ")} files up to ${Math.round(config.MAX_UPLOAD_SIZE / (1024 * 1024))} MB are supported.`,
        "INVALID_FILE_TYPE"
      )
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    logger.warn("Upload rejected: invalid mime type", { mimeType });
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
    files: 1,
  },
});

const assertStoredInUploadDir = (filePath) => {
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(uploadDir + path.sep) && resolved !== uploadDir) {
    throw new BadRequestError("Invalid upload path.", "INVALID_UPLOAD_PATH");
  }
  return resolved;
};

module.exports = {
  single: (fieldName = "file") => upload.single(fieldName),
  array: (fieldName = "files", maxCount = 10) =>
    upload.array(fieldName, maxCount),
  uploadDir,
  assertStoredInUploadDir,
};
