import test from "node:test";
import assert from "node:assert/strict";

const BASE_URL = process.env.PINGPOLICY_URL || "http://localhost:3000";
const API_KEY = process.env.PINGPOLICY_API_KEY || "pp_live_d4d113327a3d9fedf3d8d08c948497a28e830174a9dec362ef383ead7222127a";

const authHeaders = {
  "Authorization": `Bearer ${API_KEY}`,
  "Content-Type": "application/json"
};

test("1. GET /health returns 200 and service status", async () => {
  const res = await fetch(`${BASE_URL}/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.deepEqual(data, { status: "ok", service: "pingpolicy-api" });
});

test("2. Auth enforcement on protected endpoints", async (t) => {
  await t.test("rejects request missing Authorization header", async () => {
    const res = await fetch(`${BASE_URL}/v1/users/test_user/preferences`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error?.code, "API_KEY_REQUIRED");
  });

  await t.test("rejects request with malformed Bearer token", async () => {
    const res = await fetch(`${BASE_URL}/v1/users/test_user/preferences`, {
      headers: { "Authorization": "Bearer not-a-valid-key" }
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error?.code, "API_KEY_REQUIRED");
  });

  await t.test("rejects request with unrecognized 64-char hex key", async () => {
    const fakeKey = "pp_live_" + "0".repeat(64);
    const res = await fetch(`${BASE_URL}/v1/users/test_user/preferences`, {
      headers: { "Authorization": `Bearer ${fakeKey}` }
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error?.code, "INVALID_API_KEY");
  });
});

test("3. Preferences management and retrieval", async (t) => {
  const testUser = `test_user_${Date.now()}`;
  const category = "account_alerts";

  await t.test("PUT /v1/users/:id/preferences/:cat upserts user preferences", async () => {
    const payload = {
      channels: {
        email: true,
        sms: false,
        push: true,
        in_app: false
      }
    };

    const res = await fetch(`${BASE_URL}/v1/users/${testUser}/preferences/${category}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.externalUserId, testUser);
    assert.equal(json.data.category, category);
    assert.equal(Boolean(json.data.email), true);
    assert.equal(Boolean(json.data.sms), false);
    assert.equal(Boolean(json.data.push), true);
    assert.equal(Boolean(json.data.in_app), false);
  });

  await t.test("GET /v1/users/:id/preferences lists saved preferences", async () => {
    const res = await fetch(`${BASE_URL}/v1/users/${testUser}/preferences`, {
      headers: authHeaders
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(Array.isArray(json.data));
    const pref = json.data.find(p => p.category === category);
    assert.ok(pref);
    assert.equal(pref.externalUserId, testUser);
    assert.equal(Boolean(pref.email), true);
    assert.equal(Boolean(pref.sms), false);
  });
});

test("4. Policy evaluation engine (POST /v1/policy/check)", async (t) => {
  const testUser = `policy_user_${Date.now()}`;
  const configuredCategory = "security_notifications";
  const unconfiguredCategory = "random_marketing";

  // Configure user preference
  await fetch(`${BASE_URL}/v1/users/${testUser}/preferences/${configuredCategory}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      channels: { email: true, sms: false, push: true, in_app: false }
    })
  });

  await t.test("allows notification when channel preference is enabled", async () => {
    const res = await fetch(`${BASE_URL}/v1/policy/check`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        externalUserId: testUser,
        category: configuredCategory,
        channel: "email"
      })
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.allowed, true);
    assert.equal(json.data.reason, "preference_enabled");
  });

  await t.test("denies notification when channel preference is disabled", async () => {
    const res = await fetch(`${BASE_URL}/v1/policy/check`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        externalUserId: testUser,
        category: configuredCategory,
        channel: "sms"
      })
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.allowed, false);
    assert.equal(json.data.reason, "preference_disabled");
  });

  await t.test("denies by default when category has not been configured", async () => {
    const res = await fetch(`${BASE_URL}/v1/policy/check`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        externalUserId: testUser,
        category: unconfiguredCategory,
        channel: "email"
      })
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.allowed, false);
    assert.equal(json.data.reason, "preference_not_set");
  });
});

test("5. Input validation and error responses", async (t) => {
  await t.test("POST /v1/policy/check rejects unsupported channel with 400", async () => {
    const res = await fetch(`${BASE_URL}/v1/policy/check`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        externalUserId: "user_test",
        category: "orders",
        channel: "carrier_pigeon"
      })
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error?.code, "VALIDATION_ERROR");
  });

  await t.test("PUT /v1/users/:id/preferences/:cat rejects incomplete channel payload with 400", async () => {
    const res = await fetch(`${BASE_URL}/v1/users/user_test/preferences/orders`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        channels: { email: true } // missing sms, push, in_app
      })
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error?.code, "VALIDATION_ERROR");
  });

  await t.test("returns 404 for unknown endpoints", async () => {
    const res = await fetch(`${BASE_URL}/non-existent-route`);
    assert.equal(res.status, 404);
    const json = await res.json();
    assert.equal(json.error?.code, "NOT_FOUND");
  });
});
