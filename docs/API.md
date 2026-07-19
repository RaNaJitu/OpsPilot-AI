# OpsPilot AI — API Reference

Base path: `/api/v1`  
Content type: `application/json` (unless noted)  
Auth: HTTP-only cookies (`accessToken`, `refreshToken`) unless stated otherwise

Cross-origin clients must send `credentials: "include"` and be listed in `ALLOWED_ORIGINS`.

---

## Conventions

### Success

```json
{
  "success": true,
  "message": "…",
  "data": {}
}
```

Some auth responses use `loggedInUser` instead of `data`.

### Error

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable message"
}
```

| Status | Typical meaning |
|--------|-----------------|
| `400` | Validation / bad request |
| `401` | Missing or invalid credentials |
| `403` | CORS denied |
| `404` | Resource not found |
| `409` | Conflict (e.g. analysis in progress, duplicate file) |
| `429` | Rate limited |
| `500` | Server error |

---

## Health

### `GET /health`

No auth.

```json
{ "message": "ok" }
```

### `GET /`

Plain-text readiness probe for the process.

---

## Auth

### `POST /api/v1/auth/google-auth`

Rate limit: **10 / minute**

**Body**

```json
{
  "idToken": "<Google ID token>"
}
```

**Response `200`**

```json
{
  "success": true,
  "message": "Logged in successfully",
  "loggedInUser": {
    "id": "cuid",
    "email": "user@example.com",
    "name": "Jane Doe",
    "avatar": "https://…",
    "googleId": "…",
    "createdAt": "2026-07-18T00:00:00.000Z"
  }
}
```

**Cookies set:** `accessToken`, `refreshToken` (`HttpOnly`, `Secure`, `SameSite=None`).

---

### `POST /api/v1/auth/refresh-token`

Rate limit: **10 / minute**  
Requires `refreshToken` cookie.

**Response `200`**

```json
{
  "success": true,
  "message": "Access and Refresh token reissued"
}
```

Rotates both cookies and Redis refresh `jti`.

---

### `POST /api/v1/auth/logout`

Requires valid `accessToken` (+ `refreshToken` cookie for Redis cleanup).

**Response `200`**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### `POST /api/v1/auth/profile`

Requires `accessToken`.

**Response `200`**

```json
{
  "success": true,
  "message": "Fetched user details",
  "data": {
    "user": {
      "id": "cuid",
      "email": "user@example.com",
      "name": "Jane Doe",
      "avatar": "https://…",
      "createdAt": "2026-07-18T00:00:00.000Z"
    }
  }
}
```

---

## Incidents

All incident routes require authentication.

### `GET /api/v1/incidents`

**Query parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int ≥ 1 | `1` | Page number |
| `limit` | 1–50 | `10` | Page size |
| `search` | string | `""` | Search title, summary, category, root cause, services, file names, severity |
| `status` | enum | — | `PENDING` \| `ANALYZING` \| `COMPLETED` \| `FAILED` \| `ARCHIVED` |
| `severity` | enum | — | `LOW` \| `MEDIUM` \| `HIGH` \| `CRITICAL` |
| `category` | string | — | Exact category (case-insensitive) |
| `dateFrom` | `YYYY-MM-DD` | — | Created at ≥ |
| `dateTo` | `YYYY-MM-DD` | — | Created at ≤ (end of day) |

**Response `200`**

```json
{
  "success": true,
  "message": "Incidents fetched successfully.",
  "data": [ /* Incident[] with files summary */ ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

---

### `POST /api/v1/incidents/upload`

Rate limit: **10 / minute**  
`Content-Type: multipart/form-data`

| Field | Type | Required |
|-------|------|----------|
| `file` | `.log` \| `.txt` \| `.json` | Yes |
| `title` | string | Yes |

**Response `201`**

```json
{
  "success": true,
  "message": "Incident uploaded successfully.",
  "data": {
    "id": "cuid",
    "title": "Redis OOM",
    "status": "PENDING",
    "files": [
      {
        "id": "cuid",
        "originalName": "app.log",
        "fileUrl": "https://res.cloudinary.com/…",
        "publicId": "opspilot/incidents/…",
        "checksum": "…"
      }
    ]
  }
}
```

---

### `GET /api/v1/incidents/:id`

**Response `200`**

```json
{
  "success": true,
  "message": "Incident fetched successfully.",
  "data": {
    "incident": {
      "id": "cuid",
      "title": "Redis OOM",
      "status": "COMPLETED",
      "severity": "HIGH",
      "category": "REDIS",
      "files": [],
      "analyzedAt": "…",
      "analysisDurationMs": 1200
    },
    "analysis": {
      "summary": "…",
      "rootCause": "…",
      "confidence": 0.91,
      "timeline": [],
      "evidence": [],
      "recommendations": [],
      "prevention": [],
      "affectedServices": ["redis"],
      "analyzedAt": "…",
      "analysisDurationMs": 1200
    },
    "chatCount": 4,
    "runbook": {
      "title": "Redis Memory Exhaustion Runbook",
      "estimatedResolutionTime": "10-15 minutes",
      "immediateActions": [],
      "verificationSteps": [],
      "rollbackPlan": [],
      "preventionChecklist": []
    }
  }
}
```

`analysis` and `runbook` are `null` when not available.

---

### `DELETE /api/v1/incidents/:id`

Soft-archives the incident (`ARCHIVED`, `isDeleted: true`) and best-effort deletes Cloudinary assets.

**Response `200`**

```json
{
  "success": true,
  "message": "Incident archived successfully."
}
```

---

### `POST /api/v1/incidents/:id/analyze`

Rate limit: **5 / minute**

Locks the incident to `ANALYZING`, downloads the log from Cloudinary, runs OpenAI analysis, then marks `COMPLETED` (or `FAILED`).

**Response `200`**

```json
{
  "success": true,
  "message": "Incident analyzed successfully.",
  "data": { /* updated Incident */ }
}
```

| Error code | When |
|------------|------|
| `ANALYSIS_IN_PROGRESS` | Concurrent analyze |
| `LOG_FILE_NOT_FOUND` | No uploaded file |

---

### Chat

Requires `status === COMPLETED` with analysis context.

#### `GET /api/v1/incidents/:id/chat`

Returns ordered chat history.

#### `POST /api/v1/incidents/:id/chat`

Rate limit: **20 / minute**

**Body**

```json
{
  "message": "Why did Redis fail?"
}
```

(`message`: 1–2000 characters)

**Response `200`**

```json
{
  "success": true,
  "message": "Chat reply generated.",
  "data": {
    "answer": "Redis reached its configured maxmemory limit…",
    "messages": [
      { "id": "…", "role": "USER", "message": "…", "createdAt": "…" },
      { "id": "…", "role": "ASSISTANT", "message": "…", "createdAt": "…" }
    ]
  }
}
```

#### `DELETE /api/v1/incidents/:id/chat`

Clears all messages for the incident.

---

### `POST /api/v1/incidents/:id/runbook`

Rate limit: **5 / minute**  
Requires completed analysis. Upserts the runbook.

**Response `200`**

```json
{
  "success": true,
  "message": "Runbook generated successfully.",
  "data": {
    "id": "cuid",
    "incidentId": "cuid",
    "title": "Redis Memory Exhaustion Runbook",
    "estimatedResolutionTime": "10-15 minutes",
    "immediateActions": ["Restart Redis service", "Verify available memory"],
    "verificationSteps": ["Check Redis INFO memory"],
    "rollbackPlan": ["Restore previous Redis configuration"],
    "prevention": ["Configure maxmemory-policy", "Enable monitoring"],
    "modelVersion": "gpt-4o-mini",
    "createdAt": "…",
    "updatedAt": "…"
  }
}
```

---

## Dashboard

### `GET /api/v1/dashboard`

Authenticated. Aggregates the current user’s non-deleted incidents.

**Response `200`**

```json
{
  "success": true,
  "message": "Dashboard fetched successfully.",
  "data": {
    "summary": {
      "totalIncidents": 128,
      "critical": 5,
      "high": 18,
      "medium": 42,
      "low": 63,
      "resolved": 97,
      "averageConfidence": 91.4
    },
    "incidentTrend": [
      { "date": "2026-07-12", "count": 8 }
    ],
    "severityDistribution": [
      { "severity": "CRITICAL", "count": 5 },
      { "severity": "HIGH", "count": 18 },
      { "severity": "MEDIUM", "count": 42 },
      { "severity": "LOW", "count": 63 }
    ],
    "categoryDistribution": [
      { "category": "DATABASE", "count": 12 },
      { "category": "REDIS", "count": 9 }
    ],
    "topAffectedServices": [
      { "service": "auth-service", "count": 14 },
      { "service": "redis", "count": 11 }
    ],
    "recentIncidents": [
      {
        "id": "cuid",
        "title": "Redis Memory Failure",
        "severity": "HIGH",
        "status": "COMPLETED",
        "createdAt": "2026-07-18T12:00:00.000Z"
      }
    ]
  }
}
```

| Field | Notes |
|-------|--------|
| `resolved` | Count of `COMPLETED` incidents |
| `averageConfidence` | Mean of stored 0–1 confidence × 100 (one decimal) |
| `incidentTrend` | Last 14 UTC days (zero-filled) |
| `topAffectedServices` | Top 5 from completed `affectedServices` JSON |

---

## Incident statuses

```
PENDING → ANALYZING → COMPLETED
                ↘ FAILED → (re-analyze → ANALYZING)
DELETE → ARCHIVED (soft delete)
```

---

## Upload constraints

| Rule | Value |
|------|--------|
| Extensions | `.log`, `.txt`, `.json` |
| Max size | `MAX_UPLOAD_SIZE` (default 5 MB) |
| Storage | Cloudinary raw asset |
| Dedup | SHA-256 checksum (unique) |

---

## Rate limits

Implemented with `express-rate-limit` + Redis store.

| Prefix | Window | Max |
|--------|--------|-----|
| `auth` | 1 min | 10 |
| `upload` | 1 min | 10 |
| `analyze` | 1 min | 5 |
| `chat` | 1 min | 20 |
| `runbook` | 1 min | 5 |

Response when exceeded:

```json
{
  "success": false,
  "error": "RATE_LIMITED",
  "message": "Too many … requests. Please try again in a minute."
}
```
