import "dotenv/config";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  db: {
    host: required("DB_HOST"),
    port: Number(process.env.DB_PORT || 3306),
    database: required("DB_NAME"),
    user: required("DB_USER"),
    password: process.env.DB_PASSWORD ?? "",
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    ...(process.env.DB_SSL === "true" ? { ssl: { rejectUnauthorized: true } } : {}),
  },
  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
