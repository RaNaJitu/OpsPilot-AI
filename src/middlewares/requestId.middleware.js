const { randomUUID } = require("crypto");

/**
 * Attaches a request ID for correlation across logs and responses.
 * Honors inbound X-Request-Id when present (e.g. from a proxy).
 */
exports.requestId = (req, res, next) => {
  const incoming = req.headers["x-request-id"];
  const id =
    typeof incoming === "string" && incoming.trim()
      ? incoming.trim().slice(0, 128)
      : randomUUID();

  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
};
