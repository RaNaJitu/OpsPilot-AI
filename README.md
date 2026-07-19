# OpsPilot AI — Backend

AI-assisted incident operations API for Site Reliability Engineers.

Upload production logs, run structured AI analysis, chat about an incident, generate operational runbooks, and view dashboard analytics — all behind Google OAuth and cookie-based JWT sessions.

---

## Overview

| Capability | Description |
|------------|-------------|
| **Auth** | Google ID token login, HTTP-only JWT cookies, refresh rotation via Redis |
| **Incidents** | Upload logs to Cloudinary, list/search/filter, soft-archive |
| **AI Analysis** | OpenAI-powered root cause, severity, timeline, evidence, recommendations |
| **AI Chat** | Follow-up Q&A scoped to structured incident context (not raw logs) |
| **AI Runbook** | Immediate actions, verification, rollback, prevention checklist |
| **Dashboard** | KPIs, trends, severity/category distribution, top services |

**Base URL:** `http://localhost:<PORT>/api/v1`  
**Health:** `GET /health`

---

## Architecture

```
Frontend (SPA)
      │  credentials: include
      ▼
Express API  (/api/v1)
      │
      ├── Auth          → Google · JWT cookies · Redis sessions
      ├── Incidents     → Upload · Analyze · Chat · Runbook
      └── Dashboard     → Aggregations (Prisma)
              │
              ├── PostgreSQL (Prisma)
              ├── Redis (sessions · rate limits · user cache)
              ├── Cloudinary (log storage)
              └── OpenAI (analysis · chat · runbook)
```

### Design principles

- **Incident module** owns CRUD + AI features (analysis, chat, runbook).
- **Dashboard** owns aggregation/reporting only — no OpenAI.
- **AI service** stays generic (prompt → model → validate); orchestration lives in feature services.
- Chat and runbook use **structured analysis fields**, not raw log re-ingestion (faster, cheaper, more consistent).

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js · Express 5 · CommonJS |
| Database | PostgreSQL · Prisma 7 · `@prisma/adapter-pg` |
| Cache | Redis (`ioredis`) |
| Auth | Google Auth Library · JWT · HTTP-only cookies |
| Storage | Cloudinary (raw log assets) |
| AI | OpenAI API |
| Validation | Zod |
| Security | Helmet · CORS · Redis rate limiting |
| Logging | Winston |
| Tooling | ESLint · Prettier · Nodemon · Docker · GitHub Actions |

---

## Project structure

```
Backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── scripts/
│   └── seed-demo-dashboard.js
├── src/
│   ├── index.js                 # App bootstrap
│   ├── config/                  # Env, Prisma, Redis, OpenAI, Cloudinary, logger
│   ├── routes/                  # auth · incidents · dashboard
│   ├── controllers/
│   ├── services/                # Business logic + AI orchestration
│   ├── middlewares/             # CORS, auth, upload, rate limit, errors
│   ├── validations/             # Zod schemas
│   ├── prompts/                 # Incident · chat · runbook prompts
│   └── utils/
├── docs/
│   └── API.md                   # Full API reference
├── Dockerfile
├── docker-compose.yml           # Local Postgres + Redis
└── .env.example
```

---

## Getting started

### Prerequisites

- Node.js 20+
- Docker (recommended for Postgres + Redis)
- Google OAuth client ID
- OpenAI API key
- Cloudinary account

### 1. Install dependencies

```bash
npm install
```

### 2. Start local infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL (typically `localhost:5433`) and Redis (`localhost:6379`). See `docker-compose.yml` for exact ports.

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in required values (see [Environment variables](#environment-variables)).

### 4. Run migrations

```bash
npx prisma migrate deploy
# or during development:
npx prisma migrate dev
```

Generate the client (also run by `npm run build`):

```bash
npx prisma generate
```

### 5. Start the server

```bash
npm run dev      # nodemon
# or
npm start
```

Default port: `8000` (override with `PORT`).

---

## Environment variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `OPENAI_API_KEY` | OpenAI API key |
| `ALLOWED_ORIGINS` | Comma-separated frontend origins (no trailing slash) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

### Common optional

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4001` | HTTP port |
| `NODE_ENV` | `development` | `development` \| `production` |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model for AI features |
| `OPENAI_MAX_LOG_CHARS` | `100000` | Max log chars sent to analysis |
| `MAX_UPLOAD_SIZE` | `5242880` | Max upload size (bytes) |
| `CLOUDINARY_FOLDER` | `opspilot/incidents` | Cloudinary folder prefix |
| `ACCESS_TOKEN_EXP` | `5m` | Access JWT expiry (string) |
| `REFRESH_TOKEN_EXP` | `1d` | Refresh JWT expiry (string) |
| `ACCESS_TOKEN_EXP_SEC` | `900` | Cookie maxAge (seconds) |
| `REFRESH_TOKEN_EXP_SEC` | `604800` | Cookie maxAge (seconds) |
| `REDIS_USER_TTL` | `86400` | Cached user TTL (seconds) |

See `.env.example` for a complete template.

**CORS note:** Use exact frontend origins, e.g.  
`ALLOWED_ORIGINS=http://localhost:5173,https://ops-pilot-ai-fe.vercel.app`  
Do not include the API host itself.

**Database note (Supabase):** Prefer the **pooler** URL for the app (IPv4-friendly). Cap connection pool size in serverless environments. Use a direct URL for migrations when available.

---

## Authentication

```
POST /api/v1/auth/google-auth   { idToken }
        │
        ▼
Verify Google token → upsert User
        │
        ▼
Set cookies: accessToken · refreshToken  (httpOnly, Secure, SameSite=None)
        │
        ▼
Redis: refresh:{userId} = jti · user:{userId} = profile cache
```

| Concern | Behavior |
|---------|----------|
| Access | Short-lived JWT in `accessToken` cookie |
| Refresh | Rotating JWT + Redis `jti` binding |
| Protected routes | `authenticate` middleware (cookie only) |
| Cross-site SPA | `SameSite=None` + `Secure` + CORS `credentials: true` |
| Frontend | Must send `credentials: "include"` |

---

## Core workflows

### Incident lifecycle

```
Upload log → Cloudinary → Incident (PENDING)
       │
       ▼
Analyze → fetch fileUrl → OpenAI → Incident (COMPLETED) + AIResponse
       │
       ├── Chat (context = analysis fields)
       └── Runbook (upsert Runbook row)
```

### Upload

- `multipart/form-data`: fields `file`, `title`
- Allowed: `.log`, `.txt`, `.json`
- Stored on Cloudinary as **raw** assets; DB keeps `fileUrl` + `publicId`
- Duplicate content rejected via checksum uniqueness

### Analysis / chat / runbook

| Feature | Prerequisite | Context source |
|---------|--------------|----------------|
| Analyze | Uploaded file | Raw log from `fileUrl` |
| Chat | `status === COMPLETED` | Summary, root cause, timeline, evidence, recommendations |
| Runbook | `status === COMPLETED` | Same structured analysis fields |

---

## API at a glance

Full reference: **[docs/API.md](./docs/API.md)**

| Method | Endpoint | Auth |
|--------|----------|------|
| `POST` | `/api/v1/auth/google-auth` | — |
| `POST` | `/api/v1/auth/refresh-token` | Refresh cookie |
| `POST` | `/api/v1/auth/logout` | Access cookie |
| `POST` | `/api/v1/auth/profile` | Access cookie |
| `GET` | `/api/v1/incidents` | Access cookie |
| `POST` | `/api/v1/incidents/upload` | Access cookie |
| `GET` | `/api/v1/incidents/:id` | Access cookie |
| `DELETE` | `/api/v1/incidents/:id` | Access cookie |
| `POST` | `/api/v1/incidents/:id/analyze` | Access cookie |
| `GET` | `/api/v1/incidents/:id/chat` | Access cookie |
| `POST` | `/api/v1/incidents/:id/chat` | Access cookie |
| `DELETE` | `/api/v1/incidents/:id/chat` | Access cookie |
| `POST` | `/api/v1/incidents/:id/runbook` | Access cookie |
| `GET` | `/api/v1/dashboard` | Access cookie |

### Rate limits (Redis-backed)

| Scope | Limit |
|-------|-------|
| Auth | 10 / minute |
| Upload | 10 / minute |
| Analyze | 5 / minute |
| Chat | 20 / minute |
| Runbook | 5 / minute |

---

## Data model (summary)

| Model | Purpose |
|-------|---------|
| `User` | Google-linked account |
| `Incident` | Incident record + denormalized analysis fields |
| `UploadedFile` | Cloudinary `fileUrl` / `publicId`, checksum |
| `AIResponse` | Raw AI analysis payload (1:1) |
| `ChatMessage` | `USER` / `ASSISTANT` turns |
| `Runbook` | Operational runbook (1:1) |

Enums: `IncidentStatus`, `Severity`, `ChatRole`. Soft delete via `isDeleted` / `deletedAt` / `ARCHIVED`.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (Nodemon) |
| `npm start` | Production server |
| `npm run lint` | ESLint |
| `npm test` | Node.js built-in test runner |
| `npm run build` | `prisma generate` |
| `npm run seed:demo` | Seed demo dashboard data |

---

## Testing & quality

```bash
npm test
npm run lint
```

Tests live under `src/**/*.test.js` (validation, errors, middleware contracts).

---

## Deployment

### Docker

```bash
docker build -t opspilot-ai-backend .
docker run --env-file .env -p 8000:8000 opspilot-ai-backend
```

- Image: Node 20 Alpine, non-root user, healthcheck on `/health`
- Compose deploy helper: `docker-compose.deploy.yml` (expects external Postgres/Redis network)

### CI/CD

| Workflow | Purpose |
|----------|---------|
| `.github/workflows/ci.yml` | Lint, test, Prisma generate, build & push GHCR image |
| `.github/workflows/deploy-dev.yml` | Pull image, migrate, healthcheck on DEV host |

### Production checklist

- [ ] Set all required env vars on the host / platform
- [ ] `ALLOWED_ORIGINS` matches the real frontend origin(s)
- [ ] Use a managed Postgres + Redis (not `localhost`)
- [ ] Run `npx prisma migrate deploy` before serving traffic
- [ ] Frontend uses `credentials: "include"` for cookie auth
- [ ] Prefer DB pooler + small pool size for serverless/container scale-out

---

## Error format

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable message"
}
```

Unhandled errors may include `requestId` for correlation with Winston logs.

---

## License

ISC

---

## Related

- Frontend: configure API base URL to this service and enable credentialed requests.
- Detailed HTTP contracts: [docs/API.md](./docs/API.md)
