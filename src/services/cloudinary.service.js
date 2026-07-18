const crypto = require("crypto");
const cloudinary = require("../config/cloudinary");
const { config } = require("../config");
const { InternalServerError } = require("../utils/error");
const logger = require("../config/logger");

/**
 * Upload a log/text buffer to Cloudinary as a raw asset.
 */
exports.uploadIncidentFile = async ({ buffer, originalName, mimeType }) => {
  
  const extension = originalName.includes(".")
    ? originalName.split(".").pop().toLowerCase()
    : "txt";

  const publicId = `${config.CLOUDINARY_FOLDER}/${Date.now()}_${crypto.randomUUID()}`;
  
  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "raw",
          public_id: publicId,
          overwrite: false,
          format: extension,
        },
        (error, uploadResult) => {
          logger.info(`Public ID: ${publicId}`);
          logger.info(`Cloudinary upload error: ${JSON.stringify(error)}`);
          if (error) return reject(error);
          return resolve(uploadResult);
        },
      );

      stream.end(buffer);
    });

    logger.info(`Cloudinary result: ${JSON.stringify(result)}`);
    return {
      fileUrl: result.secure_url,
      publicId: result.public_id,
      bytes: result.bytes ?? buffer.length,
      format: result.format || extension,
      mimeType: mimeType || "application/octet-stream",
    };
  } catch (error) {
    throw new InternalServerError(
      error?.message || "Failed to upload file to Cloudinary.",
      "CLOUDINARY_UPLOAD_FAILED",
    );
  }
};

exports.deleteIncidentFile = async (publicId) => {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "raw",
    });
  } catch {
    // Best-effort cleanup; archive should still succeed.
  }
};
