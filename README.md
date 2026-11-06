# PingPolicy API

PingPolicy is a provider-independent API for storing notification preferences and checking whether an application should send a particular type of notification.

**Current stage:** API MVP scaffold. It does not send email, SMS, push notifications, or in-app messages.

## Why this project?

Existing projects already cover notification preferences and multi-channel delivery. PingPolicy starts with a narrower goal: a small API that an application can ask, "Is this notification allowed for this user, in this category, on this channel?"

The initial implementation is independently written. Existing projects were reviewed for product scope and API conventions, not copied. See [RESEARCH.md](./RESEARCH.md).

## Stack

- Node.js 20+
- Express
- MySQL 8+
- `mysql2`, `zod`, `helmet`, `express-rate-limit`
- Native Node test runner

## Current features

- Health endpoint
- Project-scoped API key authentication (keys are hashed in MySQL)
- Read and upsert preferences by external user ID and category
- Policy check endpoint with explicit default-deny behavior when a preference is missing
- Input validation, rate limiting, and basic security headers
- SQL schema and OpenAPI draft

## Not implemented yet

- React developer dashboard
- End-user hosted preference center
- Account registration, project management UI, billing
- Email/SMS delivery
- User consent collection or legal-compliance guarantees
- Production-ready audit logging and distributed rate limiting

## Setup

1. Install Node.js 20+ and MySQL 8+.
2. Create a database and database user with permission to create tables.
3. Copy `.env.example` to `.env` and configure the database.
4. Install dependencies and create tables:

```bash
npm install
npm run db:init
```

5. Create a project and API key:

```bash
npm run key:create
```

The script prints the API key once. Save it securely. Only its SHA-256 hash is stored in the database. Do not commit the key or `.env` file.

6. Start the API:

```bash
npm run dev
```

Health check: `http://localhost:3000/health`

## API authentication

Send the project API key in the `Authorization` header:

```http
Authorization: Bearer pp_live_REPLACE_WITH_YOUR_KEY
```

Keep this key on your server. **Never put it in a React browser bundle, public website, mobile app, or GitHub repository.** A future public preference-center flow should use short-lived, narrowly scoped signed tokens instead of exposing a project key.

## API endpoints

All endpoints except `/health` require a valid project API key.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Service health |
| GET | `/v1/users/:externalUserId/preferences` | List preferences for one external user |
| PUT | `/v1/users/:externalUserId/preferences/:category` | Create or replace one category's channel preferences |
| POST | `/v1/policy/check` | Check if a channel/category notification is allowed |

### Save preferences

```bash
curl -X PUT \
  http://localhost:3000/v1/users/user_123/preferences/product_updates \
  -H "Authorization: Bearer pp_live_REPLACE_WITH_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channels": {
      "email": true,
      "sms": false,
      "push": false,
      "in_app": true
    }
  }'
```

### Read preferences

```bash
curl http://localhost:3000/v1/users/user_123/preferences \
  -H "Authorization: Bearer pp_live_REPLACE_WITH_YOUR_KEY"
```

### Check a policy

```bash
curl -X POST http://localhost:3000/v1/policy/check \
  -H "Authorization: Bearer pp_live_REPLACE_WITH_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "externalUserId": "user_123",
    "category": "product_updates",
    "channel": "email"
  }'
```

A policy check returns `allowed: true` only when a saved preference explicitly enables that channel. If no preference exists, the API returns `allowed: false` with `reason: "preference_not_set"`. This is a product default, not a substitute for legal review or a complete consent-management system.

## Data model

- `projects`: logical customer/project boundary
- `api_keys`: project-scoped key hash and prefix
- `notification_preferences`: user/category/channel preference state

External user IDs are opaque identifiers supplied by the integrating application. PingPolicy does not create or authenticate those users.

## Security notes

- Use HTTPS in deployed environments.
- Store API keys in server-side secrets.
- Use a dedicated MySQL user with least privilege.
- Rotate/revoke keys if exposed.
- Do not log raw API keys or sensitive message content.
- Configure CORS narrowly if a browser dashboard is added.
- Before production, add stronger account authentication, key rotation/revocation UI, audit events, abuse controls, backups, and deployment security review.

## Development status

This is an early portfolio/commercial prototype. Do not use it as a production compliance or consent authority without a security review, threat model, and operational testing.

## License

MIT. See [LICENSE](./LICENSE).
