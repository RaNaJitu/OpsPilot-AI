const multer = require("multer");
const path = require("path");

const { BadRequestError } = require("../utils/error");
const { config } = require("../config");
const logger = require("../config/logger");

const ALLOWED_EXTENSIONS = [".log", ".txt", ".json"];

// Browsers often send octet-stream / empty type for .log files
const ALLOWED_MIME_TYPES = [
  "text/plain",
  "application/json",
  "application/octet-stream",
  "",
];

const isSafeOriginalName = (name) => {
  if (!name || typeof name !== "string") return false;
  if (name.includes("\0")) return false;
  if (name.includes("..") || name.includes("/") || name.includes("\\")) {
    return false;
  }
  return true;
};

const storage = multer.memoryStorage();

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
        "INVALID_FILE_TYPE",
      ),
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    logger.warn("Upload rejected: invalid mime type", { mimeType });
    return cb(
      new BadRequestError(
        `Only ${ALLOWED_EXTENSIONS.join(", ")} files up to ${Math.round(config.MAX_UPLOAD_SIZE / (1024 * 1024))} MB are supported.`,
        "INVALID_FILE_TYPE",
      ),
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

module.exports = {
  single: (fieldName = "file") => upload.single(fieldName),
  array: (fieldName = "files", maxCount = 10) =>
    upload.array(fieldName, maxCount),
};
