const crypto = require("crypto");

/**
 * Generate SHA-256 checksum from a Buffer or string.
 */
const generateChecksum = (input) => {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return crypto.createHash("sha256").update(buffer).digest("hex");
};

module.exports = {
  generateChecksum,
};
