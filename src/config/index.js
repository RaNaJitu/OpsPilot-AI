const requiredEnv = [
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "DATABASE_URL",
  "REDIS_URL",
  "GOOGLE_CLIENT_ID",
  "OPENAI_API_KEY",
  "ALLOWED_ORIGINS",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} environment variable is required`);
  }
}

const envNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const config = {
  SERVICE_NAME: require("../../package.json").name,
  PORT: envNumber(process.env.PORT, 4001),
  NODE_ENV: process.env.NODE_ENV || "development",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  ACCESS_TOKEN_EXP: process.env.ACCESS_TOKEN_EXP || "15m",
  REFRESH_TOKEN_EXP: process.env.REFRESH_TOKEN_EXP || "7d",
  ACCESS_TOKEN_EXP_SEC: envNumber(process.env.ACCESS_TOKEN_EXP_SEC, 900),
  REFRESH_TOKEN_EXP_SEC: envNumber(process.env.REFRESH_TOKEN_EXP_SEC, 604800),
  REDIS_USER_TTL: envNumber(process.env.REDIS_USER_TTL, 86400),

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

  MAX_UPLOAD_SIZE: envNumber(process.env.MAX_UPLOAD_SIZE, 5 * 1024 * 1024),
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER || "opspilot/incidents",

  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
  OPENAI_MAX_LOG_CHARS: envNumber(process.env.OPENAI_MAX_LOG_CHARS, 100000),

  VERCEL: process.env.VERCEL,
  AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME,
  FUNCTION_NAME: process.env.FUNCTION_NAME,
};

module.exports = { config };
