# OpenRouter

> A self-hosted AI gateway that provides a unified API for multiple LLM providers, with user authentication, API-key management, model/provider discovery, and credit-based usage tracking.

## Overview

OpenRouter is a Turborepo monorepo built around a simple idea: applications should be able to communicate with multiple AI providers through a single gateway.

The project is split into three main applications:

- **`apps/primary-backend`** — core application backend for authentication, API keys, model/provider information, and credits.("https://open-router-primary-backend.onrender.com/")
- **`apps/api-backend`** — AI inference gateway that accepts chat-completion requests and routes them to supported LLM providers.("https://open-router-api.onrender.com/")
- **`apps/dashboard-frontend`** — web dashboard for interacting with the platform.("https://open-router-edv9.onrender.com/")

Shared functionality lives under `packages/`, with PostgreSQL access and Prisma in `packages/db`.

## Architecture

```text
                         ┌─────────────────────────┐
                         │    Dashboard Frontend   │
                         │ apps/dashboard-frontend │
                         └────────────┬────────────┘
                                      │
                         Cookie / JWT │
                                      ▼
                         ┌─────────────────────────┐
                         │     Primary Backend     │
                         │ apps/primary-backend    │
                         │                         │
                         │ • Authentication        │
                         │ • API key management    │
                         │ • Models/providers      │
                         │ • Credits               │
                         │ • Payments/on-ramp       │
                         └────────────┬────────────┘
                                      │
                                      │ PostgreSQL
                                      ▼
                         ┌─────────────────────────┐
                         │       packages/db       │
                         │      Prisma + PostgreSQL│
                         └─────────────────────────┘

API clients
     │
     │ Authorization: Bearer <API_KEY>
     ▼
┌─────────────────────────┐
│       API Backend       │
│   apps/api-backend     │
│                         │
│ /api/v1/chat/completions│
└────────────┬────────────┘
             │
             ├──────────────► OpenAI
             │
             ├──────────────► Google Gemini
             │
             └──────────────► Anthropic Claude
```

## Features

### Unified AI API

The API backend exposes:

```text
POST /api/v1/chat/completions
```

Clients authenticate with an OpenRouter API key and send a model identifier such as:

```text
provider/model
```

The gateway:

1. Validates the supplied API key.
2. Checks that the key is active.
3. Checks the user's available credits.
4. Validates that the requested model exists.
5. Looks up providers mapped to that model.
6. Selects a provider.
7. Sends the request to the corresponding LLM SDK.
8. Normalizes the provider response.
9. Calculates usage cost.
10. Deducts credits from the user.
11. Records consumed credits against the API key.

### Supported LLM providers

The current API backend contains integrations for:

- OpenAI
- Google Gemini
- Anthropic Claude

Each provider is implemented behind a common `BaseLlm` response shape so the gateway can expose a consistent response format.

### Authentication

The primary backend provides:

- User registration
- User login
- Password hashing using Bun's password API
- JWT-based authentication
- HTTP-only authentication cookie
- Google OAuth 2.0 sign-in (`GET /auth/google` → consent screen, `GET /auth/google/callback`
  → exchanges the code, creates/links the user by email, sets the same `auth` cookie
  and redirects back to the dashboard)
- Passwordless Google accounts are supported (password is optional in the database)
- Protected API-key and payment routes
- User profile/credit lookup

The authentication cookie is configured as secure, HTTP-only, and suitable for cross-origin frontend/backend deployments.

### API key management

Authenticated users can:

- Create API keys
- List their API keys
- Disable/enable an API key
- Soft-delete an API key

Generated keys follow the project's current format:

```text
sk-or-v1-<random-suffix>
```

### Model and provider discovery

The primary backend exposes endpoints for:

- Listing supported models
- Listing providers
- Listing providers available for a specific model

Provider/model mappings also expose input and output token pricing used by the API backend for credit calculation.

### Credit system

The platform uses an internal credit balance.

When an AI request completes, the API backend calculates:

```text
credits used =
(
  input tokens × input token cost
  +
  output tokens × output token cost
) / 10
```

The user's credit balance is then decremented and the API key's consumed-credit counter is incremented.

The current payment/on-ramp implementation is a development implementation: an authenticated request adds a fixed `1000` credits and creates a completed on-ramp transaction.

## Repository Structure

```text
open-router/
├── apps/
│   ├── api-backend/
│   │   └── src/
│   │       ├── llms/
│   │       │   ├── Base.ts
│   │       │   ├── Claude.ts
│   │       │   ├── Gemini.ts
│   │       │   └── OpenAi.ts
│   │       ├── index.ts
│   │       └── types.ts
│   │
│   ├── dashboard-frontend/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   ├── pages/
│   │   │   ├── providers/
│   │   │   └── ...
│   │   └── styles/
│   │
│   └── primary-backend/
│       └── src/
│           ├── modules/
│           │   ├── apiKeys/
│           │   │   ├── index.ts
│           │   │   ├── models.ts
│           │   │   └── service.ts
│           │   ├── auth/
│           │   │   ├── index.ts
│           │   │   ├── models.ts
│           │   │   └── service.ts
│           │   ├── models/
│           │   │   ├── index.ts
│           │   │   ├── models.ts
│           │   │   └── service.ts
│           │   └── payments/
│           │       ├── index.ts
│           │       ├── models.ts
│           │       └── service.ts
│           ├── app.ts
│           └── index.ts
│
├── packages/
│   ├── db/
│   │   ├── prisma/
│   │   │   ├── migrations/
│   │   │   └── schema.prisma
│   │   ├── index.ts
│   │   ├── prisma.config.ts
│   │   └── package.json
│   ├── eslint-config/
│   ├── typescript-config/
│   └── ui/
│
├── package.json
├── turbo.json
├── bun.lock
└── README.md
```

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| Runtime | Bun |
| Backend framework | Elysia |
| Monorepo | Turborepo |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT + HTTP-only cookies |
| AI providers | OpenAI, Google Gemini, Anthropic Claude |
| Frontend | React |
| Styling | Tailwind CSS |
| API typing/validation | Elysia TypeBox schemas |
| Package manager | Bun |

## Prerequisites

Install:

- [Bun](https://bun.sh/)
- PostgreSQL
- Git

You will also need API credentials for the LLM providers you intend to use:

- OpenAI
- Google Gemini
- Anthropic Claude

You do not need credentials for providers you do not plan to enable.

## Installation

Clone the repository:

```bash
git clone https://github.com/Lalit-Kumar-Badhotiya/open-router.git
cd open-router
```

Install all workspace dependencies:

```bash
bun install
```

## Environment Variables

### Primary Backend

Create an environment file for `apps/primary-backend`.

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_SECRET=replace-with-a-long-random-secret

GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

FRONTEND_URL=http://localhost:3001
```

The primary backend uses `JWT_SECRET` to sign and verify authentication tokens, and
`DATABASE_URL` for the runtime PostgreSQL connection. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
and `GOOGLE_REDIRECT_URI` enable the Google OAuth sign-in flow, and `FRONTEND_URL`
is the dashboard origin allowed for CORS and post-OAuth redirects.

### API Backend

Create an environment file for `apps/api-backend`.

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE

OPENAI_API_KEY=your-openai-key
GOOGLE_API_KEY=your-google-gemini-key
ANTHROPIC_API_KEY=your-anthropic-key
```

Only provide real provider keys for providers you intend to use.

### Database Package

`packages/db` uses the PostgreSQL connection string for Prisma operations:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

Do not commit `.env` files or API keys to Git.

## Database Setup

The database schema is maintained in:

```text
packages/db/prisma/schema.prisma
```

Generate the Prisma client:

```bash
cd packages/db
bunx prisma generate
```

Apply existing migrations:

```bash
bunx prisma migrate deploy
```

For local schema development, Prisma migrations can be created/applied with the appropriate Prisma development command.

Return to the repository root:

```bash
cd ../..
```

## Running the Project

### Start the primary backend

```bash
cd apps/primary-backend
bun run dev
```

The current development server listens on:

```text
http://localhost:3000
```

### Start the API backend

```bash
cd apps/api-backend
bun run dev
```

The current API backend listens on:

```text
http://localhost:4000
```

### Start the dashboard

```bash
cd apps/dashboard-frontend
bun dev
```

The frontend is a Bun-powered React application.

### Run the monorepo

From the repository root:

```bash
bun run dev
```

If the root scripts are changed in the future, individual applications can always be started from their respective directories.

## Primary Backend API

The primary backend is organized into independent Elysia modules.

### Authentication

#### Sign up

```http
POST /auth/sign-up
```

Request:

```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

#### Sign in

```http
POST /auth/sign-in
```

Request:

```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

A successful login creates a JWT and stores it in the `auth` HTTP-only cookie.

#### Google OAuth

```http
GET /auth/google
```

Redirects the browser to the Google consent screen. The dashboard's
"Continue with Google" buttons link straight here — no JSON call involved.

```http
GET /auth/google/callback
```

Google redirects back here with the authorization code. The backend exchanges it,
finds or creates the user by email, sets the `auth` cookie and redirects the
browser to the dashboard. OAuth failures redirect back to the sign-in page with
a `?error=oauth` | `?error=email-unverified` query parameter.

#### Profile

```http
GET /auth/profile
```

Returns the authenticated user's current credit information.

### API Keys

#### Create an API key

```http
POST /api-keys/
```

Request:

```json
{
  "name": "My application"
}
```

#### List API keys

```http
GET /api-keys/
```

#### Enable/disable an API key

```http
PUT /api-keys/
```

Request:

```json
{
  "id": "1",
  "disabled": false
}
```

#### Delete an API key

```http
DELETE /api-keys/:id
```

Deletion is implemented as a soft delete in the database.

### Models

#### List models

```http
GET /models/
```

#### List providers

```http
GET /models/providers
```

#### List providers for a model

```http
GET /models/:id/providers
```

### Payments / Credits

#### On-ramp credits

```http
POST /payments/onramp
```

The current implementation adds a fixed development credit amount and creates an on-ramp transaction record.

## AI API

The main inference endpoint is:

```http
POST /api/v1/chat/completions
```

Authentication uses a bearer API key:

```http
Authorization: Bearer sk-or-v1-xxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
```

Example request:

```json
{
  "model": "provider/model",
  "messages": [
    {
      "role": "user",
      "content": "Hello!"
    }
  ]
}
```

The API backend uses the model's database configuration to determine which provider(s) can serve the request.

## AI Request Lifecycle

```text
Client
  │
  │ POST /api/v1/chat/completions
  │ Authorization: Bearer <API_KEY>
  ▼
Validate API key
  │
  ├── invalid/disabled/deleted ──► 403
  │
  ▼
Check user credits
  │
  ├── insufficient credits ──────► 403
  │
  ▼
Validate requested model
  │
  ├── unsupported model ─────────► 403
  │
  ▼
Load model/provider mappings
  │
  ▼
Select provider
  │
  ├── OpenAI ─────► OpenAI SDK
  ├── Google ────► Google GenAI SDK
  └── Claude ────► Anthropic SDK
  │
  ▼
Normalize provider response
  │
  ▼
Calculate token cost
  │
  ├── decrement user credits
  └── increment API-key credits consumed
  │
  ▼
Return completion response
```

## Provider Abstraction

The AI integrations share a common response type:

```text
LlmResponse
├── completions
│   └── choices
│       └── message
│           └── content
├── inputTokensConsumed
└── outputTokensConsumed
```

`Base.ts` defines the common abstraction, while provider-specific classes implement calls to their respective SDKs.

This makes the gateway independent of the response shape returned directly by each provider.

## Security

The project includes several security-related mechanisms:

- Passwords are hashed using `Bun.password.hash`.
- Password verification uses `Bun.password.verify`.
- Authentication tokens are signed with a server-side JWT secret.
- Authentication cookies are HTTP-only.
- Authentication cookies use secure/same-site settings appropriate for the deployed frontend/backend setup.
- API keys are checked against their disabled/deleted state before use.
- API keys are scoped to users for management operations.
- Provider credentials are supplied through environment variables.

### Important production considerations

Before using the project as a public production service, consider:

1. Store API keys securely, preferably hashed or encrypted at rest.
2. Generate API keys with a cryptographically secure random generator.
3. Add request rate limiting.
4. Add provider timeout/retry/fallback policies.
5. Make credit deduction and usage accounting atomic with the relevant request lifecycle.
6. Validate that a model has at least one provider mapping before selecting a provider.
7. Add structured logging and monitoring.
8. Add stricter CORS configuration for production.
9. Add payment-provider integration instead of the current development on-ramp.
10. Add comprehensive automated tests.
11. Avoid logging sensitive request/provider information in production.

## Development Notes

The project intentionally separates responsibilities:

### `primary-backend`

Responsible for platform/business logic:

```text
Authentication
      │
      ├── Users
      ├── JWT sessions
      └── Credits
      │
      ├── API keys
      │
      ├── Models
      │
      └── Payments
```

### `api-backend`

Responsible for the actual AI request path:

```text
API Key
   ↓
Model
   ↓
Provider mapping
   ↓
LLM provider
   ↓
Normalized response
   ↓
Usage calculation
```

This separation allows the public AI gateway to remain focused on inference while the primary backend manages accounts and platform state.

## Building for Production

The primary backend provides these scripts:

```bash
bun run build
bun run start
bun run prod
```

`build` bundles `src/index.ts` into `dist/` using Bun.

`start` runs the generated bundle.

`prod` performs the build and then starts the generated application.

For the API backend and frontend, use the scripts defined in their respective `package.json` files and deploy each application according to the target hosting platform.

## Deployment

The repository is structured as a monorepo, so each application can be deployed independently.

A typical deployment consists of:

```text
Frontend
    │
    ▼
Primary Backend
    │
    ├────► PostgreSQL
    │
    └────► account/platform APIs

API Backend
    │
    ├────► PostgreSQL
    ├────► OpenAI
    ├────► Google Gemini
    └────► Anthropic
```

Make sure production environment variables are configured in the hosting provider rather than committed to the repository.

## Troubleshooting

### `JWT_SECRET` is missing

Set:

```env
JWT_SECRET=your-secret
```

in the primary backend environment.

### LLM SDK reports a missing API key

Set the corresponding provider variable in the API backend environment:

```env
OPENAI_API_KEY=...
GOOGLE_API_KEY=...
ANTHROPIC_API_KEY=...
```

### Prisma cannot connect to PostgreSQL

Check:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

Then run:

```bash
cd packages/db
bunx prisma generate
bunx prisma migrate deploy
```

### Frontend cannot authenticate with the backend

The authentication flow depends on cookies being sent cross-origin. Check:

- frontend origin
- backend CORS configuration
- `credentials: true`
- HTTPS in production
- cookie `secure` and `sameSite` settings

## Contributing

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feature/your-feature
```

3. Install dependencies.

```bash
bun install
```

4. Make your changes.
5. Test the affected application(s).
6. Commit your changes.

```bash
git commit -m "feat: add your feature"
```

7. Push the branch and open a pull request.

## License

No explicit license file is currently included in the repository. If this project is intended for public reuse, add an appropriate `LICENSE` file.

## Project Status

This README documents the current repository structure and implementation. Some parts of the platform, particularly payments and production-grade reliability/security, are still suitable for further development.

---

Built with **Bun**, **Elysia**, **TypeScript**, **Prisma**, **PostgreSQL**, and multiple LLM provider SDKs.
