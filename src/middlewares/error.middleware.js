const { AppError } = require("../utils/error");
const { config } = require("../config");
const logger = require("../config/logger");
const multer = require("multer");

module.exports = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.code,
      message: err.message,
    });
  }

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      error: "UPLOAD_ERROR",
      message:
        err.code === "LIMIT_FILE_SIZE"
          ? "Maximum upload size exceeded."
          : err.message,
    });
  }

  if (err?.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      error: "CORS_DENIED",
      message: "Origin not allowed",
    });
  }

  logger.error("Unhandled error", {
    requestId: req.requestId,
    message: err.message,
    stack: config.NODE_ENV !== "production" ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  return res.status(500).json({
    success: false,
    error: "SERVER_ERROR",
    message: "Internal Server Error",
    requestId: req.requestId,
  });
};
