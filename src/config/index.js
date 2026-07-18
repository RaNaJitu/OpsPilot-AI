const config = {
  SERVICE_NAME: require('../../package.json').name,
  PORT: Number(process.env.PORT) || 4001,
  NODE_ENV: process.env.NODE_ENV || "development",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "0f8bf908f8d38527c188c93bda49d48bd421a43fa0bdf3e77de1f0db785e6f37",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "826d2c0edb5ad8f8ac7668556c034ea228931a49576aefccc80d6f469cc4a34c4da82ca43a5c43de91ffdad2f4644c655e2eb3ccbb8bc2848cb64fe7ea2a1ab9",
  ACCESS_TOKEN_EXP: process.env.ACCESS_TOKEN_EXP || "15m",
  REFRESH_TOKEN_EXP: process.env.REFRESH_TOKEN_EXP || "7d",
  ACCESS_TOKEN_EXP_SEC: Number(process.env.ACCESS_TOKEN_EXP_SEC || 900),
  REFRESH_TOKEN_EXP_SEC: Number(process.env.REFRESH_TOKEN_EXP_SEC || 604800),
  REDIS_USER_TTL: Number(process.env.REDIS_USER_TTL || 86400),

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

  MAX_UPLOAD_SIZE: Number(process.env.MAX_UPLOAD_SIZE) || 5 * 1024 * 1024, // bytes (default 5MB)

  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
  OPENAI_MAX_LOG_CHARS: Number(process.env.OPENAI_MAX_LOG_CHARS) || 100000,
}


if (!config.GOOGLE_CLIENT_ID) {
  throw new Error("GOOGLE_CLIENT_ID environment variable is required");
}
if (!config.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}


module.exports = { config };

