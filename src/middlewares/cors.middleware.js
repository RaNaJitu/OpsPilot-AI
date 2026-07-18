const cors = require("cors");
const { config } = require("../config");

const allowedOrigins = config.ALLOWED_ORIGINS.split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const isDev = config.NODE_ENV !== "production";
logger.info(`CORS isDev: ${isDev}`);
logger.info(`CORS allowedOrigins: ${allowedOrigins}`);
const corsMiddleware = cors({
  origin(origin, callback) {
    // Non-browser tools (Postman/curl) send no Origin — allow only in development
    if (!origin) {
      if (isDev) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

module.exports = { corsMiddleware };
