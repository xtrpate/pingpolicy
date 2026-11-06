import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { apiKeyAuth } from "./middleware/apiKeyAuth.js";
import { preferencesRouter } from "./routes/preferences.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "32kb" }));

if (config.corsOrigins.length) {
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS."));
    },
    methods: ["GET", "PUT", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));
}

app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false
}));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "pingpolicy-api" });
});

app.use("/v1", apiKeyAuth, preferencesRouter);

app.use((_req, res) => {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "The requested resource does not exist." }
  });
});

app.use((error, _req, res, _next) => {
  if (error.message === "Origin is not allowed by CORS.") {
    return res.status(403).json({
      error: { code: "CORS_ORIGIN_DENIED", message: "This origin is not allowed." }
    });
  }

  // Keep internal errors out of API responses. Add structured server-side logging before production.
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "An unexpected server error occurred." }
  });
});
