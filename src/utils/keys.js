import { createHash, randomBytes } from "node:crypto";

export function generateApiKey() {
  return `pp_live_${randomBytes(32).toString("hex")}`;
}

export function hashApiKey(apiKey) {
  return createHash("sha256").update(apiKey, "utf8").digest("hex");
}

export function getApiKeyPrefix(apiKey) {
  return apiKey.slice(0, 15);
}
