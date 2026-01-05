# Henio - API Reference

## Base URL

| Environment | URL |
|-------------|-----|
| Local | `http://localhost:3000` |
| UAT | `https://uat.henio.app` |
| Production | `https://henio.app` |

## Authentication

All API endpoints (except public ones) require authentication via NextAuth session cookie.

**Headers:**
```
Cookie: next-auth.session-token=<jwt_token>
```

---

## Health Check

### GET /api/health

Returns application health status and build metadata.

**Authentication:** None required

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.63",
  "commit": "f7056bc12345",
  "buildTime": "2026-01-03T10:00:00Z",
  "env": "production",
  "subsystems": {
    "database": { "status": "ok" },
    "stripe": { "status": "ok" },
    "smtp": { "status": "ok" },
    "auth": { "status": "ok" },
    "ai": { "status": "ok" }
  }
}
```

---

## Authentication Endpoints

### POST /api/auth/[...nextauth]

NextAuth handler for OAuth and credentials authentication.

### POST /api/auth/register

Register new user with email/password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "Jan Kowalski",
  "termsAccepted": true,
  "privacyAccepted": true,
  "ageConfirmed": true
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Verification email sent"
}
```

**Errors:**
- `400` - Validation error (missing fields, weak password)
- `409` - Email already registered

### GET /api/auth/verify-email

Verify email address via token link.

**Query Parameters:**
- `token` - Email verification token

**Response:** Redirect to `/login?verified=true`

**Errors:**
- `400` - Invalid or expired token

### POST /api/auth/check-capacity

Check if there's capacity for new users.

**Response:**
```json
{
  "hasCapacity": true,
  "currentActive": 45,
  "maxActive": 100
}
```

### POST /api/auth/forgot-password

Request password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "If email exists, reset link sent"
}
```

### POST /api/auth/reset-password

Reset password with token.

**Request:**
```json
{
  "token": "reset_token_here",
  "password": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

## User Endpoints

### GET /api/user/state

Get user's application state (vocabulary, progress, settings).

**Response:**
```json
{
  "vocabulary": [...],
  "sets": [...],
  "progress": {...},
  "settings": {...},
  "stats": {...},
  "dailyMission": {...}
}
```

### POST /api/user/state

Sync user's application state to server.

**Request:**
```json
{
  "vocabulary": [...],
  "sets": [...],
  "progress": {...},
  "settings": {...},
  "stats": {...},
  "dailyMission": {...}
}
```

**Response (200):**
```json
{
  "success": true,
  "updatedAt": "2026-01-03T10:00:00Z"
}
```

### GET /api/user/profile

Get user profile information.

**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "Jan Kowalski",
  "image": "https://...",
  "plan": "FREE",
  "accessStatus": "ACTIVE",
  "mascotSkin": "explorer",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

### GET /api/user/subscription

Get user's subscription details.

**Response:**
```json
{
  "plan": "PRO",
  "status": "ACTIVE",
  "currentPeriodEnd": "2026-02-01T00:00:00Z",
  "cancelAtPeriodEnd": false,
  "trialEnd": null
}
```

### GET /api/user/export

Export all user data (GDPR compliance).

**Response:** JSON file download with all user data.

### DELETE /api/user/account

Delete user account and all associated data (GDPR Art. 17).

**Response (200):**
```json
{
  "success": true,
  "message": "Account deleted"
}
```

---

## AI Endpoints

All AI endpoints require authentication and respect usage limits.

**Common Error Responses:**
- `401` - Not authenticated
- `403` - Access not ACTIVE (`waitlisted` or `suspended`)
- `429` - Usage limit reached (`user_limit_reached` or `global_limit_reached`)
- `429` - Rate limit exceeded (Retry-After header included)
- `422` - Response truncated (`response_truncated`) on JSON endpoints
- `503` - Gemini API key not configured

**Usage limit response:**
```json
{
  "error": "user_limit_reached",
  "resetAt": "2026-02-01T00:00:00.000Z",
  "limit": { "maxRequests": 60, "maxUnits": 45000 },
  "usage": { "count": 61, "units": 45210 },
  "softLimit": true
}
```

**Rate limit response:**
```json
{
  "error": "rate_limited",
  "retryAfter": 30
}
```

Some pronunciation endpoints return `fallback: true` with status `200` if AI is unavailable.

### POST /api/ai/generate-words

Generate vocabulary words from a topic.

**Request:**
```json
{
  "topic": "kitchen appliances",
  "count": 12,
  "level": "A2",
  "targetLanguage": "en",
  "nativeLanguage": "pl"
}
```

**Response:**
```json
{
  "topic": "kitchen appliances",
  "level": "A2",
  "words": [
    {
      "target": "refrigerator",
      "phonetic": "/rɪˈfrɪdʒəreɪtər/",
      "native": "lodowka",
      "example_target": "The refrigerator is in the corner.",
      "example_native": "Lodowka jest w rogu.",
      "difficulty": "easy"
    }
  ],
  "requestedCount": 12,
  "returnedCount": 10,
  "warning": "partial_result"
}
```

**Notes:**
- `level` supports `A1`, `A2`, `B1`, `B2`
- `count` max is `30`
- `warning` appears only when fewer words are returned

**Errors:**
- `400` - `unsafe_topic` or `needs_clarification`
- `413` - topic too long or count too large
- `422` - `response_truncated`

### POST /api/ai/parse-text

Parse manually entered vocabulary text.

**Request:**
```json
{
  "text": "dom - house\nkot - cat\npies - dog",
  "targetLanguage": "en",
  "nativeLanguage": "pl"
}
```

**Response:**
```json
{
  "words": [
    { "native": "dom", "target": "house", "phonetic": "/haʊs/", "difficulty": "easy" },
    { "native": "kot", "target": "cat", "phonetic": "/kæt/", "difficulty": "easy" },
    { "native": "pies", "target": "dog", "phonetic": "/dɔɡ/", "difficulty": "easy" }
  ],
  "category_suggestion": "home",
  "parse_errors": []
}
```

### POST /api/ai/extract-file

Extract vocabulary from uploaded file (PDF, DOCX, TXT, CSV).

**Request:** `multipart/form-data`
- `file` - File to process (max 30MB)
- `targetLanguage`
- `nativeLanguage`

**Response:**
```json
{
  "category_suggestion": "home",
  "words": [
    { "native": "dom", "target": "house", "phonetic": "/haʊs/", "difficulty": "easy" }
  ],
  "notes": "Input truncated to 12000 characters."
}
```

### POST /api/ai/extract-image

Extract vocabulary from uploaded image (OCR).

**Request:** `multipart/form-data`
- `file` - Image file (JPG/PNG/WebP, max 30MB)
- `targetLanguage`
- `nativeLanguage`

**Response:**
```json
{
  "category_suggestion": "home",
  "words": [
    { "native": "dom", "target": "house", "phonetic": "/haʊs/", "difficulty": "easy" }
  ],
  "notes": "Optional notes."
}
```

### POST /api/ai/explain-word

Get detailed explanation of a word.

**Request:**
```json
{
  "word": "refrigerator",
  "targetLanguage": "en",
  "nativeLanguage": "pl",
  "feedbackLanguage": "pl"
}
```

**Response:**
```json
{
  "explanation": "A refrigerator is..."
}
```

### POST /api/ai/evaluate-pronunciation

Evaluate user's pronunciation attempt.

**Request:**
```json
{
  "expected": "through",
  "spoken": "fru",
  "phonetic": "/θruː/",
  "targetLanguage": "en",
  "nativeLanguage": "pl",
  "feedbackLanguage": "pl"
}
```

**Response:**
```json
{
  "score": 6,
  "correct": false,
  "feedback": "The 'th' sound should be /θ/, not /f/.",
  "tip": "Place tongue between teeth for /θ/ sound.",
  "errorPhonemes": ["θ"]
}
```

**Fallback Response (AI unavailable):**
```json
{
  "error": "ai_failed",
  "fallback": true
}
```

### POST /api/ai/pronunciation-summary

Get summary of pronunciation session.

**Request:**
```json
{
  "averageScore": 7.2,
  "passingScore": 7,
  "focusMode": "random",
  "words": [
    { "word": "through", "score": 6, "phonetic": "/θruː/" },
    { "word": "weather", "score": 8, "phonetic": "/ˈweðər/" }
  ],
  "targetLanguage": "en",
  "nativeLanguage": "pl",
  "feedbackLanguage": "pl"
}
```

**Response:**
```json
{
  "summary": "Nice progress with vowels. Focus on 'th' sounds.",
  "tips": ["Practice minimal pairs: thin/fin", "Slow down the initial consonant."]
}
```

### POST /api/ai/tutor

AI tutor chat for learning assistance.

**Request:**
```json
{
  "message": "How do I use 'have been' vs 'had been'?",
  "context": "Previous messages or topic context.",
  "targetLanguage": "en",
  "nativeLanguage": "pl",
  "feedbackLanguage": "pl",
  "adminMode": false
}
```

**Response:**
```json
{
  "response": "'Have been' is used for..."
}
```

---

## Stripe Endpoints

### POST /api/stripe/create-checkout-session

Create Stripe checkout session for subscription.

**Request:**
```json
{
  "priceId": "price_xxx",
  "successUrl": "https://henio.app/profile?success=true",
  "cancelUrl": "https://henio.app/profile"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

### POST /api/stripe/create-portal-session

Create Stripe customer portal session.

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

### GET /api/stripe/prices

Get available subscription prices.

**Response:**
```json
{
  "prices": [
    {
      "id": "price_monthly_xxx",
      "amount": 1999,
      "currency": "pln",
      "interval": "month",
      "product": "Henio PRO"
    },
    {
      "id": "price_annual_xxx",
      "amount": 14999,
      "currency": "pln",
      "interval": "year",
      "product": "Henio PRO"
    }
  ]
}
```

### POST /api/stripe/webhook

Stripe webhook handler.

**Authentication:** Stripe signature verification

**Handled Events:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

---

## Waitlist Endpoints

### POST /api/waitlist

Join the waitlist.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Confirmation email sent"
}
```

### POST /api/waitlist/confirm

Confirm waitlist email.

**Request:**
```json
{
  "token": "confirmation_token"
}
```

**Response:**
```json
{
  "success": true,
  "status": "CONFIRMED",
  "position": 5
}
```

### POST /api/waitlist/auto-approve

Auto-approve waitlist entries (cron job).

**Authentication:** Bearer token (`WAITLIST_CRON_SECRET`)

**Response:**
```json
{
  "approved": 3,
  "remaining": 12
}
```

---

## Admin Endpoints

All admin endpoints require `isAdmin: true` in session.

### GET /api/admin/config

Get all application configuration.

**Response:**
```json
{
  "configs": [
    {
      "key": "MAX_ACTIVE_USERS",
      "value": "100",
      "description": "Maximum active users",
      "updatedAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

### PATCH /api/admin/config

Update configuration value.

**Request:**
```json
{
  "key": "MAX_ACTIVE_USERS",
  "value": "150"
}
```

### DELETE /api/admin/config/:key

Delete configuration (revert to env/default).

### GET /api/admin/users

List users with filtering.

**Query Parameters:**
- `status` - Filter by access status (ACTIVE, WAITLISTED, SUSPENDED)
- `plan` - Filter by plan (FREE, PRO)
- `search` - Search by email/name
- `page` - Page number
- `limit` - Items per page

**Response:**
```json
{
  "users": [...],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

### PATCH /api/admin/users/:userId

Update user status/plan.

**Request:**
```json
{
  "accessStatus": "ACTIVE",
  "plan": "PRO"
}
```

### GET /api/admin/stats

Get overview statistics.

**Response:**
```json
{
  "meta": { "period": "2026-01" },
  "users": {
    "active": 120,
    "waitlisted": 30,
    "suspended": 2,
    "planBreakdown": [
      { "plan": "FREE", "accessStatus": "ACTIVE", "count": 100 },
      { "plan": "PRO", "accessStatus": "ACTIVE", "count": 20 }
    ]
  },
  "aiUsage": {
    "global": {
      "count": 5000,
      "units": 200000,
      "maxRequests": 6000,
      "maxUnits": 4500000
    },
    "byPlan": [
      { "plan": "FREE", "count": 4000, "units": 120000, "maxRequests": 60, "maxUnits": 45000 },
      { "plan": "PRO", "count": 1000, "units": 80000, "maxRequests": 600, "maxUnits": 450000 }
    ],
    "topUsers": [
      { "email": "top@example.com", "count": 300, "units": 18000 }
    ]
  },
  "costs": {
    "actualMonthToDate": 12.34,
    "projectedEndOfMonth": 18.9
  }
}
```

### GET /api/admin/stats/ai-tokens

Get AI token usage statistics.

**Query Parameters:**
- `period` - `7d`, `30d`, `90d` (default: `7d`)

**Response:**
```json
{
  "period": { "start": "2026-01-01T00:00:00.000Z", "end": "2026-01-07T23:59:59.999Z" },
  "totals": {
    "requests": 5000,
    "inputTokens": 1500000,
    "outputTokens": 800000,
    "totalTokens": 2300000,
    "actualCost": 12.5,
    "successRate": 98.4,
    "avgDurationMs": 420
  },
  "byModel": [
    {
      "model": "gemini-2.5-flash",
      "requests": 4200,
      "inputTokens": 1200000,
      "outputTokens": 600000,
      "totalTokens": 1800000,
      "cost": 9.8
    }
  ],
  "byFeature": [
    {
      "feature": "generate-words",
      "requests": 2000,
      "inputTokens": 600000,
      "outputTokens": 300000,
      "totalTokens": 900000,
      "cost": 4.1,
      "errorRate": 1.2
    }
  ],
  "topUsers": [
    {
      "userId": "user_id",
      "email": "user@example.com",
      "requests": 120,
      "totalTokens": 9000,
      "cost": 0.5
    }
  ]
}
```

### GET /api/admin/stats/ai-trends

Get AI usage trends over time.

**Query Parameters:**
- `period` - `7d`, `30d`, `90d` (default: `7d`)

**Response:**
```json
{
  "period": { "start": "2026-01-01T00:00:00.000Z", "end": "2026-01-07T23:59:59.999Z" },
  "daily": [
    {
      "date": "2026-01-01",
      "requests": 700,
      "inputTokens": 200000,
      "outputTokens": 100000,
      "totalTokens": 300000,
      "cost": 1.8,
      "uniqueUsers": 120
    }
  ],
  "totals": {
    "requests": 5000,
    "inputTokens": 1500000,
    "outputTokens": 800000,
    "totalTokens": 2300000,
    "cost": 12.5,
    "uniqueUsers": 650
  }
}
```

### GET /api/admin/stats/ai-features

Get per-feature AI analytics.

**Query Parameters:**
- `period` - `7d`, `30d`, `90d` (default: `7d`)

**Response:**
```json
{
  "period": { "start": "2026-01-01T00:00:00.000Z", "end": "2026-01-07T23:59:59.999Z" },
  "features": [
    {
      "feature": "generate-words",
      "requests": 2000,
      "successCount": 1970,
      "errorCount": 30,
      "inputTokens": 600000,
      "outputTokens": 300000,
      "totalTokens": 900000,
      "cost": 4.1,
      "avgDurationMs": 420,
      "errorRate": 1.5,
      "languagePairs": [
        { "pair": "pl-en", "requests": 1200, "tokens": 520000 }
      ]
    }
  ]
}
```

### GET /api/admin/stats/revenue

Get revenue statistics.

**Response:**
```json
{
  "mrr": 499.75,
  "arr": 5997.00,
  "activeSubscriptions": 25,
  "trialSubscriptions": 5,
  "churnRate": 2.5
}
```

### GET /api/admin/subscriptions

List all subscriptions.

### GET /api/admin/pricing/products

Get Stripe products.

### GET /api/admin/pricing/prices

Get Stripe prices.

### POST /api/admin/pricing/prices

Create new price in Stripe.

### PATCH /api/admin/pricing/prices/:priceId

Update price (archive/unarchive).

### GET /api/admin/pricing/coupons

List Stripe coupons.

### POST /api/admin/ai/assist

Get AI assistance for admin tasks.

### POST /api/admin/ai/revenue-chat

Revenue strategy AI chat.

### GET /api/admin/ai/revenue-chat/history

Get revenue chat history.

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `USAGE_LIMIT_REACHED` | 429 | AI usage limit exceeded |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| AI endpoints | 30 req | 1 min |
| Auth endpoints | 5 req | 1 min |
| User state sync | 30 req | 1 min |
| General API | 60 req | 1 min |

Rate limit headers:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1704280800
Retry-After: 30
```
