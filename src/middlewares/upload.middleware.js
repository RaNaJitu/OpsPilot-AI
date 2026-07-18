const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");

const { BadRequestError } = require("../utils/error");
const { config } = require("../config");
const logger = require("../config/logger");

/**
 * Detect read-only serverless runtimes. Prefer process.env over config
 * so this works even if config was built before platform vars were visible.
 */
const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  __dirname.includes(`${path.sep}var${path.sep}task`) ||
  process.cwd().includes(`${path.sep}var${path.sep}task`),
);

/**
 * Local/dev: project uploads dir.
 * Serverless (Vercel/Lambda): only /tmp is writable — never mkdir under /var/task.
 */
const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : isServerless
    ? path.join(os.tmpdir(), "opspilot-uploads", "incidents")
    : path.resolve(__dirname, "../uploads/incidents");

const ALLOWED_EXTENSIONS = [".log", ".txt", ".json"];

// Browsers often send octet-stream / empty type for .log files
const ALLOWED_MIME_TYPES = [
  "text/plain",
  "application/json",
  "application/octet-stream",
  "",
];

const ensureUploadDir = () => {
  fs.mkdirSync(uploadDir, { recursive: true });
};

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
    try {
      ensureUploadDir();
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
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

const assertStoredInUploadDir = (filePath) => {
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(uploadDir + path.sep) && resolved !== uploadDir) {
    throw new BadRequestError("Invalid upload path.", "INVALID_UPLOAD_PATH");
  }
  return resolved;
};

/**
 * Persist a path that can be reopened later.
 * Under /tmp (serverless), store absolute paths — relative-to-cwd escapes the project.
 */
const toStoredUploadPath = (absolutePath) => {
  const resolved = path.resolve(absolutePath);
  const relative = path.relative(process.cwd(), resolved).replace(/\\/g, "/");

  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return resolved;
  }

  return relative;
};

module.exports = {
  single: (fieldName = "file") => upload.single(fieldName),
  array: (fieldName = "files", maxCount = 10) =>
    upload.array(fieldName, maxCount),
  uploadDir,
  assertStoredInUploadDir,
  toStoredUploadPath,
};
