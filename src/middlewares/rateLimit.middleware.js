const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { redis } = require("../config/redis");

const createLimiter = ({ windowMs, max, message, prefix }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: "RATE_LIMITED",
      message,
    },
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
      prefix: `rl:${prefix}:`,
    }),
  });

/** Auth endpoints: google login + refresh */
exports.authLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  prefix: "auth",
  message: "Too many auth attempts. Please try again in a minute.",
});

/** File uploads */
exports.uploadLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  prefix: "upload",
  message: "Too many uploads. Please try again in a minute.",
});

/** AI analysis (expensive) */
exports.analyzeLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 5,
  prefix: "analyze",
  message: "Too many analysis requests. Please try again in a minute.",
});
