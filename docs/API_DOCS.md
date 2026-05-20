# API Documentation — SMS API

**Last Updated:** May 21, 2026 | **Version:** 1.2.0 | **Project:** SMSRepoA  
**Base URL:** `http://localhost:5092` (dev) | `https://api.your-domain.com` (prod)  
**Format:** JSON | **Authentication:** JWT Bearer Token

---

## Index

- [Authentication](#authentication)
- [Students](#students)
- [Fees](#fees)
- [Billing Management](#billing-management)
- [Health & Status](#health--status)
- [Error Responses](#error-responses)
- [Rate Limiting](#rate-limiting)

---

## Authentication

### Login

**Endpoint:** `POST /api/Auth/login`

**Request:**
```bash
curl -X POST http://localhost:5092/api/Auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@vitanaschools.edu","password":"Admin1234!"}'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "admin@vitanaschools.edu",
      "role": "Admin",
      "schoolId": "550e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

**Error Responses:**

| Status | Code | Reason |
|--------|------|--------|
| 401 | `INVALID_CREDENTIALS` | Wrong username/password |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many attempts (10 per minute) |

### Bearer Token Usage

Include the token in the `Authorization` header for all protected endpoints:

```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5092/api/Students
```

Tokens expire after 60 minutes (configurable in `JwtSettings:ExpirationInMinutes`).

---

## Students

### List Students

**Endpoint:** `GET /api/Students`  
**Auth:** Required

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `pageSize` | int | 10 | Max 100 |
| `searchTerm` | string | — | Filter by name/email |
| `sortBy` | string | `CreatedAt` | Sort field |
| `sortOrder` | string | `desc` | `asc` or `desc` |

**Request:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:5092/api/Students?page=1&pageSize=10'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "admissionNumber": "STU-2024-001",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phone": "9876543210",
        "class": "Class 10",
        "section": "A",
        "status": "active",
        "aadhaarNumber": "XXXX-XXXX-1234"
      }
    ],
    "total": 125,
    "page": 1,
    "pageSize": 10,
    "totalPages": 13
  }
}
```

---

### Get Student by ID

**Endpoint:** `GET /api/Students/{id}`  
**Auth:** Required

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5092/api/Students/550e8400-e29b-41d4-a716-446655440001
```

**Success Response (200 OK):** Full student object with guardian info, address, documents.  
**Error:** `404` if student not found or belongs to another school.

---

### Create Student

**Endpoint:** `POST /api/Students`  
**Auth:** Required (Admin/Staff)

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "dateOfBirth": "2009-05-15",
    "gender": "male",
    "bloodGroup": "B+",
    "category": "General",
    "class": "Class 10",
    "section": "A",
    "admissionNumber": "STU-2024-001",
    "aadhaarNumber": "1234-5678-9012",
    "address": "123 Main Street",
    "city": "New Delhi",
    "state": "Delhi",
    "pincode": "110001",
    "guardianName": "Jane Doe",
    "guardianPhone": "9876543211"
  }' \
  http://localhost:5092/api/Students
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "admissionNumber": "STU-2024-001",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "aadhaarNumber", "message": "Invalid Aadhaar number format" },
    { "field": "phone", "message": "Must be a 10-digit Indian mobile number" }
  ]
}
```

---

### Update Student

**Endpoint:** `PUT /api/Students/{id}`  
**Auth:** Required (Admin/Staff)  
**Response:** `204 No Content`

---

### Delete Student

**Endpoint:** `DELETE /api/Students/{id}`  
**Auth:** Required (Admin)  
**Response:** `204 No Content`  
**Note:** Soft delete — `IsDeleted` set to `true`. Data is retained.

---

## Fees

### Apply Fee Head Overrides

**Endpoint:** `PATCH /api/Fees/records/{id}/fee-head-overrides`  
**Auth:** Required — roles: Admin, Principal, Finance, FinanceOfficer, Accountant  
**Added:** May 19, 2026

Sets per-student overrides for individual fee heads (e.g. Library Fee exemption). Reduces `TotalAmount` directly — does **not** add to `DiscountAmount`. Overrides are persisted as a JSON dictionary in the `FeeHeadOverrides` column and merged with any previous overrides.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | `Guid` | Fee record ID (`FeeRecord.Id`) |

**Request Body:**
```json
{
  "overrides": {
    "libraryFee": 0,
    "labFee": 500
  },
  "appliedBy": "admin@school.edu"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `overrides` | `Dictionary<string, decimal>` | ✅ | Map of fee head key → override amount. Use the fee head key as stored on `FeeStructureComponent`. |
| `appliedBy` | `string` | ❌ | Username/email of person applying the override (for audit log). |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Fee head overrides applied successfully.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "totalAmount": 42000.00,
    "pendingAmount": 42000.00,
    "discountAmount": 0.00,
    "feeHeadOverrides": "{\"libraryFee\":0,\"labFee\":500}",
    ...
  }
}
```

**Error Responses:**

| Status | Reason |
|--------|--------|
| 401 | Not authenticated |
| 403 | Role not permitted |
| 404 | Fee record not found |
| 400 | `overrides` dict is empty or null |

**Example:**
```bash
curl -X PATCH http://localhost:5092/api/Fees/records/550e8400-e29b-41d4-a716-446655440000/fee-head-overrides \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"overrides":{"libraryFee":0},"appliedBy":"admin@school.edu"}'
```

---

### Remove Concession / Discount

**Endpoint:** `POST /api/Fees/records/{id}/remove-discount`  
**Auth:** Required — roles: Admin, Principal, Finance, FinanceOfficer, Accountant  
**Added:** May 19, 2026

Zeroes out the `DiscountAmount` on a fee record and recalculates `PendingAmount`. Used when a previously granted concession must be reversed. Action is audit-logged.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | `Guid` | Fee record ID (`FeeRecord.Id`) |

**Request Body:**
```json
{
  "reason": "Student no longer eligible for merit concession",
  "removedBy": "principal@school.edu"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | `string` | ❌ | Reason for removal (stored in audit log). |
| `removedBy` | `string` | ❌ | Username/email of person removing the concession (for audit log). |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Discount removed successfully.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "discountAmount": 0.00,
    "pendingAmount": 45000.00,
    ...
  }
}
```

**Error Responses:**

| Status | Reason |
|--------|--------|
| 401 | Not authenticated |
| 403 | Role not permitted (Teacher/Staff cannot remove discounts) |
| 404 | Fee record not found |

**Example:**
```bash
curl -X POST http://localhost:5092/api/Fees/records/550e8400-e29b-41d4-a716-446655440000/remove-discount \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"No longer eligible","removedBy":"principal@school.edu"}'
```

---

## Billing Management

> **Auth roles:** `GET` requires `SuperAdmin` or `Admin`; `PUT` requires `SuperAdmin` only; notification endpoint requires any authenticated role.

### Get School Billing

**Endpoint:** `GET /api/school-feature-permissions/schools/{schoolId}/billing`  
**Auth:** `SuperAdmin` or `Admin`

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5092/api/school-feature-permissions/schools/550e8400-e29b-41d4-a716-446655440000/billing
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "schoolId": "550e8400-e29b-41d4-a716-446655440000",
    "schoolName": "Ajith International Schools",
    "billingPlan": "Pro",
    "billingStatus": "Active",
    "billingExpiryDate": "2027-05-20T00:00:00",
    "renewalReminderDays": 30,
    "daysUntilExpiry": 365,
    "isExpiringSoon": false,
    "isExpired": false
  }
}
```

`isExpiringSoon` is `true` when `daysUntilExpiry <= renewalReminderDays`.  
`isExpired` is `true` when `billingExpiryDate` is in the past.

---

### Update School Billing

**Endpoint:** `PUT /api/school-feature-permissions/schools/{schoolId}/billing`  
**Auth:** `SuperAdmin` only

**Request:**
```bash
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "billingPlan": "Enterprise",
    "billingStatus": "Active",
    "billingExpiryDate": "2028-01-01",
    "renewalReminderDays": 45
  }' \
  http://localhost:5092/api/school-feature-permissions/schools/550e8400-e29b-41d4-a716-446655440000/billing
```

**Fields (all optional — only supplied fields are updated):**

| Field | Type | Allowed Values |
|-------|------|----------------|
| `billingPlan` | string | `Standard`, `Pro`, `Enterprise` |
| `billingStatus` | string | `Active`, `Inactive`, `Suspended`, `Trial` |
| `billingExpiryDate` | ISO 8601 date | any future date |
| `renewalReminderDays` | int | 1–365 |

**Success Response (200 OK):** Same shape as GET response above, with updated values.

---

### Get Billing Notification (Admin Dashboard)

**Endpoint:** `GET /api/school-feature-permissions/billing-notification`  
**Auth:** Any authenticated user (scoped to the caller's school via tenant context)

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5092/api/school-feature-permissions/billing-notification
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "hasWarning": true,
    "message": "Your Pro subscription expires in 6 days. Please renew to avoid service interruption.",
    "severity": "critical",
    "daysUntilExpiry": 6,
    "billingPlan": "Pro",
    "billingStatus": "Active",
    "billingExpiryDate": "2026-05-27T00:00:00"
  }
}
```

**Severity values:**

| Value | Condition |
|-------|-----------|
| `info` | Healthy — more than `renewalReminderDays` away |
| `warning` | Within `renewalReminderDays` of expiry |
| `critical` | Expired **or** ≤ 7 days remaining |

When `hasWarning = false` the admin dashboard suppresses any toast notification. The frontend gates further calls with `sessionStorage` so the toast appears at most once per browser session.

---

## Health & Status

### Health Check

**Endpoint:** `GET /health`  
**Auth:** Not required

```bash
curl http://localhost:5092/health
```

**Healthy (200 OK):**
```json
{
  "status": "Healthy",
  "totalDuration": 69.05,
  "entries": {
    "database": { "status": "Healthy", "description": "Database connection successful." },
    "self":     { "status": "Healthy", "description": "Application is running" }
  }
}
```

**Unhealthy (503):**
```json
{
  "status": "Unhealthy",
  "entries": {
    "database": { "status": "Unhealthy", "description": "Connection timeout" }
  }
}
```

**Other endpoints:**

| URL | Description |
|-----|-------------|
| `/health-ui` | Visual health dashboard (HealthChecks.UI) |
| `/swagger` | Interactive API explorer (dev/staging only) |

---

## Error Responses

### Standard Format (RFC 7807)

```json
{
  "type": "https://httpstatuscodes.com/400",
  "title": "Bad Request",
  "status": 400,
  "detail": "One or more validation errors occurred",
  "traceId": "0HN2V8TLBK9C7:00000001",
  "errors": {
    "email": ["Invalid email format"]
  }
}
```

### Error Code Reference

| HTTP Status | Meaning |
|-------------|---------|
| `400` | Validation failed — check `errors` object |
| `401` | Missing or invalid Bearer token |
| `403` | Token valid but role lacks permission |
| `404` | Resource not found (or belongs to another school) |
| `409` | Duplicate — resource already exists |
| `429` | Rate limit exceeded — back off and retry |
| `500` | Internal server error — check Seq logs |

---

## Rate Limiting

| Endpoint | Production | Development | Window |
|----------|-----------|-------------|--------|
| `POST /api/Auth/login` | 10 req/min | 1000 req/min | 1 min |
| Global (all endpoints) | 200 req/min | 10000 req/min | 1 min |
| File uploads | 5 req/min | 500 req/min | 1 min |
| Bulk import | 10 req / 5 min | 100 req / 5 min | 5 min |

### Rate Limit Headers

```
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 195
X-RateLimit-Reset: 1714287600
Retry-After: 30
```

---

## API Conventions

### Pagination

All list endpoints accept `page` (1-based) and `pageSize` (capped at 100).

```json
{
  "data": { "items": [...], "total": 500, "page": 2, "pageSize": 10, "totalPages": 50 }
}
```

### Tenant Isolation

All data is automatically scoped to the authenticated user's school. There is no need to pass `schoolId` in request bodies — it is applied via global query filter.

### PII Masking

Sensitive fields are masked in API responses and logs:

| Field | Display | Stored |
|-------|---------|--------|
| Aadhaar | `XXXX-XXXX-1234` | Encrypted |
| PAN | `ABCDE0000F` (full, validated) | Plain |
| Phone | `XXXXXX3210` (in logs) | Plain |

### Soft Delete Behaviour

`DELETE` endpoints set `IsDeleted = true`. Deleted records are excluded from all standard queries. Admins can restore via dedicated restore endpoints.

---

**Related:** [TECHNICAL_DOCUMENT.md](./TECHNICAL_DOCUMENT.md) | [DEFAULT_CREDENTIALS.md](./DEFAULT_CREDENTIALS.md) | [CODING_AGENT_GUIDELINES.md](./CODING_AGENT_GUIDELINES.md)
