import { hashApiKey } from "../utils/keys.js";
import { pool } from "../db.js";

export async function apiKeyAuth(req, res, next) {
  const authorization = req.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(pp_live_[A-Fa-f0-9]{64})$/);

  if (!match) {
    return res.status(401).json({
      error: {
        code: "API_KEY_REQUIRED",
        message: "Provide a valid project API key using Authorization: Bearer <key>."
      }
    });
  }

  try {
    const keyHash = hashApiKey(match[1]);
    const [rows] = await pool.execute(
      `SELECT project_id
       FROM api_keys
       WHERE key_hash = ? AND revoked_at IS NULL
       LIMIT 1`,
      [keyHash]
    );

    if (!rows.length) {
      return res.status(401).json({
        error: { code: "INVALID_API_KEY", message: "The API key is invalid or revoked." }
      });
    }

    req.projectId = rows[0].project_id;
    next();
  } catch (error) {
    next(error);
  }
}
