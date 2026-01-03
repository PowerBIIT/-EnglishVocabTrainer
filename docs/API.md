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
  "buildTime": "2026-01-03T10:00:00Z"
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
- `402` - Usage limit reached (upgrade to PRO)
- `403` - Access not ACTIVE
- `429` - Rate limit exceeded (Retry-After header included)

### POST /api/ai/generate-words

Generate vocabulary words from a topic.

**Request:**
```json
{
  "topic": "kitchen appliances",
  "count": 10,
  "languagePair": "pl-en",
  "difficulty": "medium"
}
```

**Response:**
```json
{
  "words": [
    {
      "native": "lodówka",
      "target": "refrigerator",
      "pronunciation": "/rɪˈfrɪdʒəreɪtər/",
      "category": "kitchen",
      "examples": ["The refrigerator is in the corner."]
    }
  ],
  "usage": {
    "inputTokens": 150,
    "outputTokens": 320
  }
}
```

### POST /api/ai/parse-text

Parse manually entered vocabulary text.

**Request:**
```json
{
  "text": "dom - house\nkot - cat\npies - dog",
  "languagePair": "pl-en"
}
```

**Response:**
```json
{
  "words": [
    { "native": "dom", "target": "house" },
    { "native": "kot", "target": "cat" },
    { "native": "pies", "target": "dog" }
  ],
  "usage": { "inputTokens": 50, "outputTokens": 80 }
}
```

### POST /api/ai/extract-file

Extract vocabulary from uploaded file (PDF, DOCX, TXT, CSV).

**Request:** `multipart/form-data`
- `file` - File to process (max 10MB)
- `languagePair` - Target language pair

**Response:**
```json
{
  "words": [...],
  "sourceType": "pdf",
  "pageCount": 3,
  "usage": { "inputTokens": 500, "outputTokens": 200 }
}
```

### POST /api/ai/extract-image

Extract vocabulary from uploaded image (OCR).

**Request:** `multipart/form-data`
- `image` - Image file (max 10MB)
- `languagePair` - Target language pair

**Response:**
```json
{
  "words": [...],
  "detectedText": "Original text from image...",
  "usage": { "inputTokens": 1000, "outputTokens": 300 }
}
```

### POST /api/ai/explain-word

Get detailed explanation of a word.

**Request:**
```json
{
  "word": "refrigerator",
  "languagePair": "pl-en",
  "context": "kitchen"
}
```

**Response:**
```json
{
  "explanation": "A refrigerator is...",
  "etymology": "From Latin...",
  "examples": ["Keep the milk in the refrigerator."],
  "synonyms": ["fridge", "icebox"],
  "usage": { "inputTokens": 80, "outputTokens": 150 }
}
```

### POST /api/ai/evaluate-pronunciation

Evaluate user's pronunciation attempt.

**Request:**
```json
{
  "word": "through",
  "userPronunciation": "fru",
  "expectedPronunciation": "/θruː/",
  "languagePair": "pl-en"
}
```

**Response:**
```json
{
  "score": 6,
  "feedback": "The 'th' sound should be /θ/, not /f/.",
  "phonemeErrors": [
    { "expected": "θ", "actual": "f", "position": "initial" }
  ],
  "tips": ["Place tongue between teeth for /θ/ sound."],
  "usage": { "inputTokens": 100, "outputTokens": 120 }
}
```

### POST /api/ai/pronunciation-summary

Get summary of pronunciation session.

**Request:**
```json
{
  "attempts": [
    { "word": "through", "score": 6, "phonemeErrors": [...] },
    { "word": "weather", "score": 8, "phonemeErrors": [...] }
  ],
  "languagePair": "pl-en"
}
```

**Response:**
```json
{
  "overallScore": 7,
  "strengths": ["Good vowel sounds"],
  "weaknesses": ["/θ/ sound needs practice"],
  "recommendations": ["Focus on 'th' minimal pairs"],
  "usage": { "inputTokens": 200, "outputTokens": 150 }
}
```

### POST /api/ai/tutor

AI tutor chat for learning assistance.

**Request:**
```json
{
  "message": "How do I use 'have been' vs 'had been'?",
  "context": {
    "languagePair": "pl-en",
    "currentTopic": "grammar"
  }
}
```

**Response:**
```json
{
  "response": "'Have been' is used for...",
  "examples": [...],
  "followUpQuestions": [...],
  "usage": { "inputTokens": 150, "outputTokens": 300 }
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
  "totalUsers": 150,
  "activeUsers": 120,
  "waitlistedUsers": 30,
  "proUsers": 25,
  "dailyActiveUsers": 45,
  "weeklyActiveUsers": 80
}
```

### GET /api/admin/stats/ai-tokens

Get AI token usage statistics.

**Query Parameters:**
- `period` - `day`, `week`, `month`

**Response:**
```json
{
  "totalRequests": 5000,
  "totalInputTokens": 1500000,
  "totalOutputTokens": 800000,
  "estimatedCost": 12.50,
  "byFeature": {
    "generate-words": { "requests": 2000, "tokens": 500000 },
    "tutor": { "requests": 1500, "tokens": 400000 }
  }
}
```

### GET /api/admin/stats/ai-trends

Get AI usage trends over time.

### GET /api/admin/stats/ai-features

Get per-feature AI analytics.

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
| `USAGE_LIMIT_REACHED` | 402 | AI usage limit exceeded |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| AI endpoints | 10 req | 1 min |
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
