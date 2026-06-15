# ClearScan API Documentation

Base URL: `http://localhost:4000/api`

All responses are JSON. Authenticated routes require `Authorization: Bearer <token>` header.

---

## Authentication

### POST /auth/register
Create a new patient account.

**Body:**
```json
{ "email": "user@example.com", "password": "securepass", "first_name": "Jane", "last_name": "Smith", "phone": "5551234567" }
```
**Response:** `{ token, user: { id, email, first_name, last_name, role } }`

---

### POST /auth/login
**Body:** `{ "email": "...", "password": "..." }`
**Response:** `{ token, user }`

---

### GET /auth/me  🔒
Returns the authenticated user's profile.

---

## Search

### GET /search
Search imaging centers by ZIP code with optional filters.

**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| zip | string | ✅ | 5-digit US ZIP code |
| modality | string | — | e.g. "MRI" |
| body_part | string | — | e.g. "Brain" |
| protocol_id | uuid | — | Specific protocol ID |
| radius | number | — | Miles (default: 50) |
| sort | string | — | `distance` \| `price` \| `price_desc` |

**Response:**
```json
{
  "zip": "75035",
  "location": { "lat": 33.1584, "lng": -96.8236, "city": "Frisco", "state": "TX" },
  "radius_miles": 50,
  "total": 42,
  "results": [{
    "pricing_id": "uuid",
    "price": 263.22,
    "price_source": "site",
    "center_id": "uuid",
    "center_name": "Diagnostic Imaging Center – Frisco",
    "address_line1": "4525 Ohio Dr",
    "city": "Frisco", "state": "TX", "zip_code": "75035",
    "distance_miles": 0.3,
    "protocol_id": "uuid",
    "protocol_name": "Cervical Spine w/o Contrast",
    "body_part_name": "Spine",
    "modality_name": "MRI",
    "same_day_appointments": true
  }]
}
```

---

### GET /search/modalities
Returns all active imaging modalities.

### GET /search/body-parts?modality_id=<uuid>
Returns body parts for a modality.

### GET /search/protocols?body_part_id=<uuid>
Returns protocols for a body part.

---

## Payments

### POST /payments/create-checkout-session
Create a Stripe Checkout session and appointment record.

**Body:**
```json
{
  "pricing_id": "uuid",
  "patient_first_name": "Jane",
  "patient_last_name": "Smith",
  "patient_email": "jane@example.com",
  "patient_phone": "5551234567",
  "preferred_date": "2026-07-15",
  "preferred_time": "morning",
  "referring_physician": "Dr. Johnson",
  "has_referral": true
}
```

**Response:**
```json
{ "checkout_url": "https://checkout.stripe.com/...", "session_id": "cs_...", "appointment_id": "uuid", "confirmation_number": "CS-ABCD1234" }
```

After payment, Stripe redirects to `/booking/success?session_id=cs_...&confirmation=CS-ABCD1234`

---

### POST /payments/webhook
Stripe webhook endpoint. Requires raw body and `stripe-signature` header.

**Handled events:**
- `checkout.session.completed` → marks appointment as `paid`
- `payment_intent.payment_failed` → marks payment as `failed`
- `charge.refunded` → marks appointment as `refunded`

---

### GET /payments/session/:sessionId
Check payment status after Stripe redirect.

---

## Appointments

### GET /appointments/my  🔒
Returns authenticated user's appointment history.

### GET /appointments/:id
Returns a single appointment by ID.

### GET /appointments/confirm/:confirmationNumber
Look up appointment by confirmation number.

---

## Admin (requires admin role) 🔒🛡️

### GET /admin/dashboard
Returns platform statistics.

### Imaging Centers
| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/centers | List all centers (paginated, searchable) |
| GET | /admin/centers/:id | Get single center with pricing count |
| POST | /admin/centers | Create new center |
| PUT | /admin/centers/:id | Update center |
| DELETE | /admin/centers/:id | Deactivate center (soft delete) |

**Create/Update center body:**
```json
{
  "name": "Advanced Imaging – Dallas",
  "address_line1": "1234 Main St",
  "address_line2": "Suite 100",
  "city": "Dallas", "state": "TX", "zip_code": "75201",
  "latitude": 32.7767, "longitude": -96.7970,
  "phone": "(214) 555-0100",
  "accreditation": "ACR",
  "npi_number": "1234567890",
  "typical_wait_days": 1,
  "is_active": true,
  "same_day_appointments": true
}
```

### Center Pricing
| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/centers/:id/pricing | List all pricing for a center |
| POST | /admin/centers/:id/pricing | Create or update a single protocol price |
| PUT | /admin/centers/:id/pricing/bulk | Bulk update multiple prices |

**Upsert price body:**
```json
{ "protocol_id": "uuid", "price": 263.22, "price_source": "site", "is_available": true }
```

### Appointments
| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/appointments | List appointments (filterable by status, searchable) |
| PATCH | /admin/appointments/:id/status | Update appointment status |

**Valid statuses:** `pending_payment`, `paid`, `scheduled`, `completed`, `cancelled`, `refunded`

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/users | List users (paginated) |
| PATCH | /admin/users/:id/role | Promote/demote user (`patient` or `admin`) |

---

## Error Responses

All errors follow this format:
```json
{ "error": "Human-readable error message", "detail": "Optional detail (e.g. DB constraint)" }
```

Common HTTP status codes:
- `400` — Bad request / validation error
- `401` — Authentication required or token invalid
- `403` — Insufficient permissions
- `404` — Resource not found
- `409` — Conflict (e.g. duplicate email)
- `500` — Internal server error

---

## AI Endpoints

Both endpoints require `ANTHROPIC_API_KEY` in `backend/.env`. Without it they return `503` and the UI falls back to dropdowns. Rate limited to 30 requests / 15 min per IP.

### POST /ai/scan-finder
Maps plain-English input to catalog protocols.

**Body:**
```json
{ "text": "MRI lumbar spine without contrast" }
```

**Response:**
```json
{
  "match_type": "order",
  "needs_physician_order": false,
  "clarifying_note": null,
  "disclaimer": null,
  "matches": [{
    "protocol_id": "uuid",
    "protocol_name": "Lumbar Spine w/o Contrast",
    "body_part_name": "Spine",
    "modality_name": "MRI",
    "color_hex": "#D6E4F0",
    "price_from": "264.10",
    "confidence": "high",
    "reason": "Exact match for the ordered study."
  }]
}
```

**match_type values:**
- `order` — input names a specific scan; direct matches returned
- `symptom` — input describes symptoms only; informational options returned with a disclaimer; `needs_physician_order: true`
- `unrelated` — input is not about medical imaging; empty matches

### POST /ai/extract-referral
Extracts structured order details from an uploaded physician referral.

**Body:**
```json
{
  "file_base64": "<base64 string, no data: prefix needed>",
  "media_type": "image/jpeg"
}
```
Accepted media types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`. Max 10MB.

**Response:**
```json
{
  "extraction": {
    "patient_first_name": "Jane",
    "patient_last_name": "Smith",
    "patient_dob": "1985-03-12",
    "referring_physician": "Dr. Robert Johnson",
    "physician_npi": "1234567890",
    "ordered_study_text": "MRI lumbar spine w/o contrast",
    "cpt_code": "72148",
    "icd10_codes": ["M54.5"],
    "clinical_indication": "Chronic low back pain x 6 months",
    "contrast_specified": "without",
    "matched_protocol_id": "uuid",
    "match_confidence": "high",
    "extraction_notes": null
  },
  "matched_protocol": {
    "protocol_id": "uuid",
    "protocol_name": "Lumbar Spine w/o Contrast",
    "modality_name": "MRI",
    "price_from": "264.10"
  }
}
```
