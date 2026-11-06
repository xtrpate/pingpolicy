import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { CHANNEL_COLUMNS, evaluatePreference } from "../services/policy.js";

export const preferencesRouter = Router();

const externalUserIdSchema = z.string().trim().min(1).max(191);
const categorySchema = z.string().trim().min(1).max(100);
const channelsSchema = z.object({
  email: z.boolean(),
  sms: z.boolean(),
  push: z.boolean(),
  in_app: z.boolean()
}).strict();

function invalid(res, message, details) {
  return res.status(400).json({
    error: { code: "VALIDATION_ERROR", message, details }
  });
}

preferencesRouter.get("/users/:externalUserId/preferences", async (req, res, next) => {
  const parsed = externalUserIdSchema.safeParse(req.params.externalUserId);
  if (!parsed.success) return invalid(res, "Invalid externalUserId.", parsed.error.issues);

  try {
    const [rows] = await pool.execute(
      `SELECT external_user_id AS externalUserId, category,
              email_enabled AS email, sms_enabled AS sms,
              push_enabled AS push, in_app_enabled AS in_app,
              created_at AS createdAt, updated_at AS updatedAt
       FROM notification_preferences
       WHERE project_id = ? AND external_user_id = ?
       ORDER BY category`,
      [req.projectId, parsed.data]
    );
    return res.json({ data: rows });
  } catch (error) {
    next(error);
  }
});

preferencesRouter.put("/users/:externalUserId/preferences/:category", async (req, res, next) => {
  const user = externalUserIdSchema.safeParse(req.params.externalUserId);
  const category = categorySchema.safeParse(req.params.category);
  const body = z.object({ channels: channelsSchema }).strict().safeParse(req.body);

  if (!user.success) return invalid(res, "Invalid externalUserId.", user.error.issues);
  if (!category.success) return invalid(res, "Invalid category.", category.error.issues);
  if (!body.success) return invalid(res, "Body must contain boolean values for all supported channels.", body.error.issues);

  const { email, sms, push, in_app } = {
    email: body.data.channels.email,
    sms: body.data.channels.sms,
    push: body.data.channels.push,
    in_app: body.data.channels.in_app
  };

  try {
    await pool.execute(
      `INSERT INTO notification_preferences
        (project_id, external_user_id, category, email_enabled, sms_enabled, push_enabled, in_app_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         email_enabled = VALUES(email_enabled),
         sms_enabled = VALUES(sms_enabled),
         push_enabled = VALUES(push_enabled),
         in_app_enabled = VALUES(in_app_enabled)`,
      [req.projectId, user.data, category.data, email, sms, push, in_app]
    );

    const [rows] = await pool.execute(
      `SELECT external_user_id AS externalUserId, category,
              email_enabled AS email, sms_enabled AS sms,
              push_enabled AS push, in_app_enabled AS in_app,
              created_at AS createdAt, updated_at AS updatedAt
       FROM notification_preferences
       WHERE project_id = ? AND external_user_id = ? AND category = ?
       LIMIT 1`,
      [req.projectId, user.data, category.data]
    );

    return res.status(200).json({ data: rows[0] });
  } catch (error) {
    next(error);
  }
});

preferencesRouter.post("/policy/check", async (req, res, next) => {
  const bodySchema = z.object({
    externalUserId: externalUserIdSchema,
    category: categorySchema,
    channel: z.enum(["email", "sms", "push", "in_app"])
  }).strict();
  const body = bodySchema.safeParse(req.body);
  if (!body.success) return invalid(res, "Invalid policy check request.", body.error.issues);

  try {
    const [rows] = await pool.execute(
      `SELECT email_enabled, sms_enabled, push_enabled, in_app_enabled
       FROM notification_preferences
       WHERE project_id = ? AND external_user_id = ? AND category = ?
       LIMIT 1`,
      [req.projectId, body.data.externalUserId, body.data.category]
    );

    const result = evaluatePreference(rows[0] || null, body.data.channel);
    return res.json({
      data: {
        externalUserId: body.data.externalUserId,
        category: body.data.category,
        channel: body.data.channel,
        ...result
      }
    });
  } catch (error) {
    next(error);
  }
});
