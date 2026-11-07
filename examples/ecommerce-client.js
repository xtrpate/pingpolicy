/**
 * Example E-Commerce Notification Dispatcher
 * Demonstrates integration with PingPolicy API before dispatching messages.
 */

const PINGPOLICY_BASE_URL = process.env.PINGPOLICY_URL || "http://localhost:3000";
const PROJECT_API_KEY = process.env.PINGPOLICY_API_KEY || "pp_live_d4d113327a3d9fedf3d8d08c948497a28e830174a9dec362ef383ead7222127a";

async function canSendNotification(userId, category, channel) {
  const response = await fetch(`${PINGPOLICY_BASE_URL}/v1/policy/check`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${PROJECT_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      externalUserId: userId,
      category,
      channel
    })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(`PingPolicy check failed: ${response.status} ${JSON.stringify(errorBody)}`);
  }

  const { data } = await response.json();
  return data;
}

async function dispatchNotification({ userId, category, channel, message }) {
  console.log(`\n[Dispatch Request] Attempting to notify ${userId} via ${channel.toUpperCase()} for "${category}"...`);

  const policy = await canSendNotification(userId, category, channel);

  if (policy.allowed) {
    console.log(`-> ALLOWED (${policy.reason}): Dispatching message via ${channel} provider: "${message}"`);
  } else {
    console.log(`-> DENIED (${policy.reason}): Suppressing notification. Channel not allowed by user preference.`);
  }
}

async function runDemo() {
  console.log("=== Starting PingPolicy Client Integration Demo ===");

  const customerId = "customer_1001";

  // 1. Order update via email (Configured as enabled -> should be ALLOWED)
  await dispatchNotification({
    userId: customerId,
    category: "order_updates",
    channel: "email",
    message: "Your order #98234 has shipped!"
  });

  // 2. Order update via SMS (Configured as disabled -> should be DENIED)
  await dispatchNotification({
    userId: customerId,
    category: "order_updates",
    channel: "sms",
    message: "Flash sale alert!"
  });

  // 3. Promotional offers via email (Unconfigured category -> should default to DENIED)
  await dispatchNotification({
    userId: customerId,
    category: "promotional_offers",
    channel: "email",
    message: "20% off your next purchase!"
  });

  console.log("\n=== Demo Complete ===");
}

runDemo().catch(console.error);
