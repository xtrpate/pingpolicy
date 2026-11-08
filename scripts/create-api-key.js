import "dotenv/config";
import { randomBytes } from "node:crypto";
import mysql from "mysql2/promise";
import { generateApiKey, hashApiKey, getApiKeyPrefix } from "../src/utils/keys.js";

const name = process.argv.slice(2).join(" ").trim() || "Local development project";
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ...(process.env.DB_SSL === "true" ? { ssl: { rejectUnauthorized: true } } : {}),
});

try {
  await connection.beginTransaction();
  const [projectResult] = await connection.execute(
    "INSERT INTO projects (name) VALUES (?)",
    [name]
  );
  const apiKey = generateApiKey();
  await connection.execute(
    "INSERT INTO api_keys (project_id, key_prefix, key_hash) VALUES (?, ?, ?)",
    [projectResult.insertId, getApiKeyPrefix(apiKey), hashApiKey(apiKey)]
  );
  await connection.commit();

  console.log(`Project created: ${name} (ID ${projectResult.insertId})`);
  console.log("Copy this API key now. It cannot be retrieved later:");
  console.log(apiKey);
  console.log("Store it in a server-side secret; never commit it or expose it in browser code.");
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
