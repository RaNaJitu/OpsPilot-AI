const fs = require("fs");
const crypto = require("crypto");

/**
 * Generate SHA-256 checksum using a stream
 */
const generateChecksum = (filePath) =>
    new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256");
        const stream = fs.createReadStream(filePath);

        stream.on("error", reject);
        stream.on("data", (chunk) => hash.update(chunk));
        stream.on("end", () => resolve(hash.digest("hex")));
    });

module.exports = {
    generateChecksum,
};