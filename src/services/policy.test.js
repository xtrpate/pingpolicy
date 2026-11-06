import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePreference } from "./policy.js";

test("missing preferences deny by default", () => {
  assert.deepEqual(evaluatePreference(null, "email"), {
    allowed: false,
    reason: "preference_not_set"
  });
});

test("an enabled channel is allowed", () => {
  assert.deepEqual(evaluatePreference({ email_enabled: 1 }, "email"), {
    allowed: true,
    reason: "preference_enabled"
  });
});

test("a disabled channel is denied", () => {
  assert.deepEqual(evaluatePreference({ email_enabled: 0 }, "email"), {
    allowed: false,
    reason: "preference_disabled"
  });
});

test("unknown channels are denied", () => {
  assert.deepEqual(evaluatePreference({ email_enabled: 1 }, "carrier_pigeon"), {
    allowed: false,
    reason: "unsupported_channel"
  });
});
