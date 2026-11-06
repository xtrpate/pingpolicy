export const CHANNEL_COLUMNS = Object.freeze({
  email: "email_enabled",
  sms: "sms_enabled",
  push: "push_enabled",
  in_app: "in_app_enabled"
});

export function evaluatePreference(preference, channel) {
  if (!Object.hasOwn(CHANNEL_COLUMNS, channel)) {
    return { allowed: false, reason: "unsupported_channel" };
  }

  if (!preference) {
    return { allowed: false, reason: "preference_not_set" };
  }

  const enabled = Boolean(preference[CHANNEL_COLUMNS[channel]]);
  return enabled
    ? { allowed: true, reason: "preference_enabled" }
    : { allowed: false, reason: "preference_disabled" };
}
