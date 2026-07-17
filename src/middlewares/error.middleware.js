// middlewares/error.middleware.js
const { AppError } = require('../utils/error');
const {config} = require('../config');
const logger = require('../config/logger');
const multer = require("multer");

module.exports = (err, req, res, next) => {
     if (err instanceof AppError) {
          return res.status(err.statusCode).json({
               success: false,
               error: err.code,
               message: err.message
          });
     }

     console.error("UNHANDLED ERROR:", err);

     if(config.NODE_ENV !== "production"){
          logger.error({
               message: err.message,
               stack: err.stack,
               path: req.path,
               method: req.method,
               body: req.body,
               query: req.query
          })
     }
     return res.status(500).json({
          success: false,
          error: "SERVER_ERROR",
          message: "Internal Server Error"
     });
};


module.exports.errorHandler = (err, req, res, next) => {

     // Multer Errors
     if (err instanceof multer.MulterError) {
          return res.status(400).json({
               success: false,
               message:
                    err.code === "LIMIT_FILE_SIZE"
                         ? "Maximum upload size is 10 MB."
                         : err.message,
          });
     }

     // Custom Errors
     if (err.statusCode) {
          return res.status(err.statusCode).json({
               success: false,
               message: err.message,
               errorCode: err.errorCode,
          });
     }

     console.error(err);

     return res.status(500).json({
          success: false,
          message: "Internal Server Error",
     });
};