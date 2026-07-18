const { v2: cloudinary } = require("cloudinary");
const { config } = require("./index");

if (
  !config.CLOUDINARY_CLOUD_NAME ||
  !config.CLOUDINARY_API_KEY ||
  !config.CLOUDINARY_API_SECRET
) {
  throw new Error(
    "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required",
  );
}

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
  secure: true,
});

module.exports = cloudinary;
