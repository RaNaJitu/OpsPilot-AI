const winston = require("winston");
const { config } = require(".");

const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  defaultMeta: { service: config.SERVICE_NAME },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, service, requestId, ...rest }) => {
      const rid = requestId ? ` [req:${requestId}]` : "";
      const extraKeys = Object.keys(rest).filter((k) => k !== "service");
      const extra =
        extraKeys.length > 0
          ? ` ${JSON.stringify(
              Object.fromEntries(extraKeys.map((k) => [k, rest[k]]))
            )}`
          : "";
      return `[${timestamp}] [${level}] [${service}]${rid}: ${message}${extra}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
