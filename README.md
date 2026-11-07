# PingPolicy API

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5-lightgrey.svg)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-blue.svg)](https://www.mysql.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**PingPolicy** is a high-performance, provider-independent Notification Preferences and Policy Management REST API built with **Node.js**, **Express 5**, and **MySQL**.

---

## 💡 The Core Problem & Solution

* **The Problem:** Modern products send hundreds of notifications (order updates, receipts, marketing offers, account alerts) via SMS, email, mobile push, and in-app alerts. Dispatching via providers like Twilio, SendGrid, or AWS SNS costs real money and API credits. If user preference checking is tightly coupled or scattered across microservices, users get spammed, channels get blocked, and marketing/transactional boundaries blur.
* **The Solution:** External apps (e-commerce, booking platforms, customer support) decide **what** notification to send. PingPolicy decides **whether** that notification is permitted based on live user category and channel preferences *before* dispatching messages.

---

## 🏛️ Architecture & Dispatch Flow

### Policy Evaluation Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Customer as User / Customer
    participant App as External App (E-Commerce Backend)
    participant PingPolicy as PingPolicy REST API
    participant DB as MySQL (Project-Isolated DB)
    participant Provider as Dispatch Provider (Twilio / SendGrid)

    Customer->>App: Update Preferences (Disable SMS for Order Updates)
    App->>PingPolicy: PUT /v1/users/{id}/preferences/order_updates
    PingPolicy->>DB: Upsert preferences (project_id, user_id, category)
    DB-->>PingPolicy: OK
    PingPolicy-->>App: 200 OK (Preferences Saved)

    Note over App,Provider: Later: An order event triggers
    App->>PingPolicy: POST /v1/policy/check { user_id, category: "order_updates", channel: "sms" }
    PingPolicy->>DB: Query preference for project_id + user_id + category
    DB-->>PingPolicy: Found (sms_enabled = 0)
    PingPolicy-->>App: 200 OK { allowed: false, reason: "preference_disabled" }
    
    alt If Policy is Allowed
        App->>Provider: Dispatch SMS / Email
        Provider-->>Customer: Deliver Message
    else If Policy is Denied
        App->>App: Suppress Dispatch (Save credits & prevent spam)
    end
```

---

## ✨ Key Features

- **Multi-Tenant Project Isolation:** Every request is authenticated against a project-scoped API key (`pp_live_...`). Data is strictly partitioned by `project_id`; one project cannot view or modify another project's preferences.
- **Fail-Safe Default-Deny:** Unconfigured categories or channels automatically evaluate to `allowed: false` (`reason: "preference_not_set"`), ensuring notifications are never sent without explicit opt-in.
- **Multi-Channel Coverage:** First-class support for `email`, `sms`, `push`, and `in_app` channels across arbitrary application categories.
- **Secure Key Storage:** Raw API keys are never stored in the database. Only cryptographically secure SHA-256 hashes are persisted.
- **Production-Ready Foundation:** Built with strict Zod schema validation, Helmet HTTP security headers, CORS origin restrictions, and sliding window rate limiting.
- **Comprehensive Testing:** Complete suite of unit tests and end-to-end integration tests powered by Node's native test runner (`node:test`).

---

## 🛠️ Tech Stack

* **Runtime:** Node.js (v20+ or v24 LTS recommended)
* **Framework:** Express 5 (`express@^5.1.0`)
* **Database:** MySQL 8.0+ (`mysql2` connection pooling)
* **Validation:** Zod 3
* **Security:** Helmet, Express Rate Limit, SHA-256 API key hashing
* **Test Runner:** Native Node Test Runner (`node:test`, `node:assert/strict`)
* **Specification:** OpenAPI 3.0.3 ([`openapi.yaml`](./openapi.yaml))

---

## 🚀 Quickstart & Installation

### Prerequisites

- Node.js 20+ installed
- MySQL 8.0+ running locally or in Docker

### 1. Clone & Install Dependencies

```powershell
git clone https://github.com/xtrpate/pingpolicy.git
cd pingpolicy/pingpolicy-api-mvp
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure your MySQL credentials:

```powershell
Copy-Item .env.example .env
```

Edit `.env`:
```ini
NODE_ENV=development
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=pingpolicy
DB_USER=root
DB_PASSWORD=""
DB_CONNECTION_LIMIT=10
CORS_ORIGINS=http://localhost:5173
```

### 3. Initialize Database & Tables

```powershell
npm run db:init
```

### 4. Provision a Project & API Key

```powershell
npm run key:create
```

*The script prints a newly generated API key (e.g. `pp_live_d4d1133...`). Save it immediately; raw keys are never stored in plaintext.*

### 5. Start the Server

```powershell
npm run dev
```

The server listens on `http://localhost:3000`.

---

## 📡 API Reference & Interactive Examples

### Authentication

All endpoints under `/v1/*` require your project API key passed via the `Authorization` header:

```http
Authorization: Bearer pp_live_YOUR_API_KEY
```

---

### 1. Health Check

Verifies that the API service is active and responsive. (No authentication required).

* **Method:** `GET`
* **Path:** `/health`

#### cURL (Bash)
```bash
curl http://localhost:3000/health
```

#### PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
```

#### Response (`200 OK`)
```json
{
  "status": "ok",
  "service": "pingpolicy-api"
}
```

---

### 2. Upsert Channel Preferences

Sets or updates channel preferences for a user under a specific category.

* **Method:** `PUT`
* **Path:** `/v1/users/:externalUserId/preferences/:category`

#### cURL (Bash)
```bash
curl -X PUT http://localhost:3000/v1/users/customer_1001/preferences/order_updates \
  -H "Authorization: Bearer pp_live_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channels": {
      "email": true,
      "sms": false,
      "push": true,
      "in_app": false
    }
  }'
```

#### PowerShell
```powershell
$headers = @{
  "Authorization" = "Bearer pp_live_YOUR_API_KEY"
  "Content-Type"  = "application/json"
}
$body = @{
  channels = @{
    email  = $true
    sms    = $false
    push   = $true
    in_app = $false
  }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/v1/users/customer_1001/preferences/order_updates" `
  -Method Put -Headers $headers -Body $body
```

#### Response (`200 OK`)
```json
{
  "data": {
    "externalUserId": "customer_1001",
    "category": "order_updates",
    "email": 1,
    "sms": 0,
    "push": 1,
    "in_app": 0,
    "createdAt": "2026-11-07T03:00:00.000Z",
    "updatedAt": "2026-11-07T03:00:00.000Z"
  }
}
```

---

### 3. Retrieve User Preferences

Retrieves all configured categories and channel preferences for a given user.

* **Method:** `GET`
* **Path:** `/v1/users/:externalUserId/preferences`

#### cURL (Bash)
```bash
curl http://localhost:3000/v1/users/customer_1001/preferences \
  -H "Authorization: Bearer pp_live_YOUR_API_KEY"
```

#### PowerShell
```powershell
$headers = @{ "Authorization" = "Bearer pp_live_YOUR_API_KEY" }
Invoke-RestMethod -Uri "http://localhost:3000/v1/users/customer_1001/preferences" `
  -Method Get -Headers $headers
```

#### Response (`200 OK`)
```json
{
  "data": [
    {
      "externalUserId": "customer_1001",
      "category": "order_updates",
      "email": 1,
      "sms": 0,
      "push": 1,
      "in_app": 0,
      "createdAt": "2026-11-07T03:00:00.000Z",
      "updatedAt": "2026-11-07T03:00:00.000Z"
    }
  ]
}
```

---

### 4. Evaluate Policy Check

Checks whether a notification can be sent to a user for a specific category and channel.

* **Method:** `POST`
* **Path:** `/v1/policy/check`

#### cURL (Bash)
```bash
curl -X POST http://localhost:3000/v1/policy/check \
  -H "Authorization: Bearer pp_live_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "externalUserId": "customer_1001",
    "category": "order_updates",
    "channel": "email"
  }'
```

#### PowerShell
```powershell
$headers = @{
  "Authorization" = "Bearer pp_live_YOUR_API_KEY"
  "Content-Type"  = "application/json"
}
$body = @{
  externalUserId = "customer_1001"
  category       = "order_updates"
  channel        = "email"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/v1/policy/check" `
  -Method Post -Headers $headers -Body $body
```

#### Response: Allowed (`200 OK`)
```json
{
  "data": {
    "externalUserId": "customer_1001",
    "category": "order_updates",
    "channel": "email",
    "allowed": true,
    "reason": "preference_enabled"
  }
}
```

#### Response: Denied (`200 OK`)
```json
{
  "data": {
    "externalUserId": "customer_1001",
    "category": "order_updates",
    "channel": "sms",
    "allowed": false,
    "reason": "preference_disabled"
  }
}
```

#### Response: Default-Deny (`200 OK`)
```json
{
  "data": {
    "externalUserId": "customer_1001",
    "category": "promotional_offers",
    "channel": "email",
    "allowed": false,
    "reason": "preference_not_set"
  }
}
```

---

## 🧪 Testing & Client Simulation

### Run Unit & Integration Test Suites

PingPolicy uses Node's native test runner without third-party test dependencies:

```powershell
# Run the complete test suite (unit + live integration)
npm test

# Or run integration tests individually
node --test test/integration.test.js
```

### Run Live E-Commerce Simulation

To see how an external service interacts with PingPolicy before dispatching:

```powershell
node examples/ecommerce-client.js
```

**Simulation Output:**
```text
=== Starting PingPolicy Client Integration Demo ===

[Dispatch Request] Attempting to notify customer_1001 via EMAIL for "order_updates"...
-> ALLOWED (preference_enabled): Dispatching message via email provider: "Your order #98234 has shipped!"

[Dispatch Request] Attempting to notify customer_1001 via SMS for "order_updates"...
-> DENIED (preference_disabled): Suppressing notification. Channel not allowed by user preference.

[Dispatch Request] Attempting to notify customer_1001 via EMAIL for "promotional_offers"...
-> DENIED (preference_not_set): Suppressing notification. Channel not allowed by user preference.

=== Demo Complete ===
```

---

## 🔒 Error Handling Reference

| HTTP Status | Error Code | Description |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Request body or parameters failed Zod schema validation. |
| `401` | `API_KEY_REQUIRED` | Missing or malformed `Authorization: Bearer <key>` header. |
| `401` | `INVALID_API_KEY` | API key hash was not found or has been revoked. |
| `403` | `CORS_ORIGIN_DENIED` | Origin not permitted by CORS whitelist configuration. |
| `404` | `NOT_FOUND` | The requested route does not exist. |
| `500` | `INTERNAL_ERROR` | Internal server error (details omitted from client responses). |

---

## 📂 Project Structure

```text
pingpolicy-api-mvp/
├── examples/
│   └── ecommerce-client.js         # Integration demo simulating external dispatch gating
├── scripts/
│   ├── create-api-key.js           # CLI script to generate project API keys
│   └── init-db.js                  # Database initializer and table creator
├── sql/
│   └── schema.sql                  # MySQL database DDL schema
├── src/
│   ├── middleware/
│   │   └── apiKeyAuth.js           # Project key SHA-256 authentication middleware
│   ├── routes/
│   │   └── preferences.js          # REST endpoints for preferences and policy check
│   ├── services/
│   │   ├── policy.js               # Core policy evaluation rules (default-deny)
│   │   └── policy.test.js          # Unit tests for policy evaluation engine
│   ├── utils/
│   │   └── keys.js                 # API key generator and SHA-256 hasher
│   ├── app.js                      # Express app configuration & middleware
│   ├── config.js                   # Environment configuration loader
│   ├── db.js                       # MySQL connection pool
│   └── server.js                   # Application server entrypoint
├── test/
│   └── integration.test.js         # Automated end-to-end integration test suite
├── .env.example                    # Environment variable template
├── openapi.yaml                    # OpenAPI 3.0.3 specification
└── package.json                    # Dependencies and scripts
```

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
