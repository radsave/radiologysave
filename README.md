# ClearScan — Full-Stack Diagnostic Imaging Platform

> WSL2 (Ubuntu/Debian) edition

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Node.js 20 + Express |
| Database | PostgreSQL 16 (open source) |
| ORM / Migrations | Knex.js |
| Auth | JWT + bcrypt |
| Payments | Stripe Checkout + Webhooks |
| Geo Search | Google Maps Geocoding API (optional) |
| Containers | Docker + Docker Compose (optional) |
| AI Features | Anthropic Claude API (Scan Finder + Referral Extraction) |

---

## Project Structure

```
clearscan/
├── backend/
│   ├── knexfile.js              ← Knex CLI entry point (DB migrations)
│   ├── .env.example             ← Copy to .env and fill in secrets
│   ├── package.json
│   ├── src/
│   │   ├── server.js            ← Express app entry point
│   │   ├── config/
│   │   │   ├── database.js      ← Knex connection instance
│   │   │   ├── knexfile.js      ← Knex config (imported by database.js)
│   │   │   └── stripe.js        ← Stripe client
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── search.controller.js
│   │   │   ├── payment.controller.js
│   │   │   └── admin.controller.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js   ← JWT verify, requireAdmin
│   │   │   └── error.middleware.js  ← Global error handler
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── search.routes.js
│   │   │   ├── catalog.routes.js
│   │   │   ├── payment.routes.js
│   │   │   ├── appointment.routes.js
│   │   │   └── admin.routes.js
│   │   └── services/
│   │       └── geo.service.js   ← ZIP geocoding + Haversine distance
│   ├── migrations/              ← Knex DB migrations (run in order)
│   │   ├── 001_create_users.js
│   │   ├── 002_create_imaging_centers.js
│   │   ├── 003_create_catalog.js
│   │   ├── 004_create_pricing.js
│   │   └── 005_create_appointments.js
│   └── seeds/
│       └── 001_seed_data.js     ← All 133 protocols + 5 sample centers
│
├── frontend/
│   ├── vite.config.js           ← Vite dev server (WSL host/polling config)
│   ├── tailwind.config.js
│   ├── .env.example
│   ├── index.html
│   └── src/
│       ├── App.jsx              ← React Router routes
│       ├── main.jsx
│       ├── utils/api.js         ← Axios client + named API helpers
│       ├── hooks/useAuth.js     ← Zustand auth store (persisted)
│       ├── styles/globals.css
│       ├── components/
│       │   ├── shared/PatientLayout.jsx
│       │   └── admin/AdminLayout.jsx
│       └── pages/
│           ├── patient/
│           │   ├── HomePage.jsx
│           │   ├── SearchPage.jsx       ← ZIP search + cascading dropdowns
│           │   ├── BookingPage.jsx      ← Patient form + Stripe redirect
│           │   ├── BookingSuccessPage.jsx
│           │   ├── LoginPage.jsx
│           │   ├── RegisterPage.jsx
│           │   └── AccountPage.jsx
│           └── admin/
│               ├── AdminLogin.jsx
│               ├── AdminDashboard.jsx
│               ├── AdminCenters.jsx
│               ├── AdminCenterForm.jsx  ← Create/edit + per-protocol pricing
│               ├── AdminAppointments.jsx
│               └── AdminUsers.jsx
│
├── docker/
│   ├── docker-compose.yml       ← WSL2-compatible compose file
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── postgres-init.sql
│
├── scripts/                     ← All bash scripts (WSL/Linux)
│   ├── install-deps-wsl.sh      ← Installs Node.js, PostgreSQL, optionally Docker
│   ├── setup.sh                 ← Creates .env files, installs npm deps
│   ├── dev.sh                   ← Starts backend + frontend concurrently
│   ├── db-setup.sh              ← Creates Postgres user + database locally
│   └── stripe-webhook.sh        ← Forwards Stripe events to localhost
│
└── docs/
    └── api.md                   ← Full REST API reference
```

---

## Quick Start

### Prerequisites (WSL2 Ubuntu/Debian)

**Step 1 — Install system dependencies** (Node.js 20, PostgreSQL 16):
```bash
bash scripts/install-deps-wsl.sh
```

**Step 2 — Clone and set up the project**:
```bash
bash scripts/setup.sh
```
This creates `.env` files from the examples and runs `npm install` in both
`backend/` and `frontend/`.

**Step 3 — Fill in your secrets**:
```bash
# Open with your preferred editor, e.g.:
nano backend/.env
# or
code backend/.env
```

Minimum required secrets:
| Variable | Where to get it |
|----------|----------------|
| `STRIPE_SECRET_KEY` | https://dashboard.stripe.com/apikeys |
| `STRIPE_PUBLISHABLE_KEY` | Same page |
| `STRIPE_WEBHOOK_SECRET` | Run `bash scripts/stripe-webhook.sh` |

---

### Option A — Docker Compose (recommended)

Requires Docker Desktop with WSL2 backend, or Docker Engine installed in WSL.

```bash
# From the project root
docker compose -f docker/docker-compose.yml up --build
```

On first run this will:
1. Pull `postgres:16-alpine` and start the database
2. Build backend and frontend images
3. Run all Knex migrations automatically
4. Seed the database (5 centers, 133 protocols, all pricing)
5. Start both servers

| Service | URL |
|---------|-----|
| Patient portal | http://localhost:5173 |
| Admin portal | http://localhost:5173/admin |
| API server | http://localhost:4000/api |

To stop: `Ctrl+C`, then `docker compose -f docker/docker-compose.yml down`

To reset the database: `docker compose -f docker/docker-compose.yml down -v && docker compose -f docker/docker-compose.yml up --build`

---

### Option B — Manual (no Docker)

```bash
# 1. Set up the local PostgreSQL database
bash scripts/db-setup.sh

# 2. Verify backend/.env has the correct DATABASE_URL:
#    postgresql://clearscan:clearscan_dev_password@localhost:5432/clearscan_db

# 3. Run migrations and seeds, then start both servers
bash scripts/dev.sh
```

**Database commands** (run from `backend/`):
```bash
cd backend

# Run pending migrations
npx knex migrate:latest

# Roll back last migration batch
npx knex migrate:rollback

# Run seed files
npx knex seed:run

# Full reset (rollback all → migrate → seed)
npm run db:reset

# Create a new migration file
npx knex migrate:make my_migration_name
```

---

### Stripe Webhook (local dev)

In a separate WSL terminal:
```bash
bash scripts/stripe-webhook.sh
```

Copy the `whsec_...` secret it prints into `backend/.env`:
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

Use Stripe test card: **4242 4242 4242 4242** · any future date · any CVC

---

## Default Credentials

| Portal | URL | Email | Password |
|--------|-----|-------|----------|
| Admin | http://localhost:5173/admin | admin@clearscan.com | Admin@123! |

**Change the admin password immediately after first login.**

---

## Environment Variables

### `backend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Random string for signing JWTs — generate with `openssl rand -hex 64` |
| `JWT_EXPIRES_IN` | — | Token lifetime (default: `7d`) |
| `STRIPE_SECRET_KEY` | ✅ | From Stripe dashboard (use `sk_test_` in dev) |
| `STRIPE_PUBLISHABLE_KEY` | ✅ | From Stripe dashboard (`pk_test_` in dev) |
| `STRIPE_WEBHOOK_SECRET` | ✅ | From `stripe listen` output |
| `GOOGLE_MAPS_API_KEY` | — | For accurate ZIP geocoding; falls back to TX hardcoded coords without it |
| `ANTHROPIC_API_KEY` | — | Powers AI Scan Finder + Referral Extraction; UI falls back to dropdowns without it |
| `FRONTEND_URL` | — | Default: `http://localhost:5173` |
| `SMTP_*` | — | For booking confirmation emails (optional) |

### `frontend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | — | Default: `/api` (proxied via Vite) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | ✅ | Your `pk_test_...` key |

---


---

## AI Features

Two GenAI capabilities are built in, powered by the Anthropic Claude API:

### 1. Plain-English Scan Finder
On the homepage and search page, patients can type things like:
- *"MRI lumbar spine without contrast"* → maps directly to the catalog protocol
- *"My doctor ordered a CT of my sinuses"* → maps to CT Sinus w/o Contrast
- *"Knee pain after running"* → shows scans physicians commonly order, with a
  clear disclaimer that a physician's order is required (never recommends)

Endpoint: `POST /api/ai/scan-finder` · UI component: `frontend/src/components/patient/ScanFinder.jsx`

### 2. Referral Auto-Extraction
On the booking page, patients upload a photo or PDF of their physician's order.
The AI extracts patient name, DOB, referring physician, NPI, CPT/ICD-10 codes,
and the ordered study — then pre-fills the booking form and warns if the
referral doesn't match the protocol being booked.

Endpoint: `POST /api/ai/extract-referral` · UI component: `frontend/src/components/patient/ReferralUpload.jsx`

### Setup
1. Get an API key at https://console.anthropic.com
2. Add to `backend/.env`: `ANTHROPIC_API_KEY=sk-ant-...`
3. Restart the backend

Without the key, AI endpoints return 503 and the UI gracefully falls back to
the dropdown flow. AI routes are rate-limited to 30 requests / 15 min per IP.

### Safety guardrails
The scan finder never diagnoses or recommends scans from symptoms — it only
shows what physicians commonly order, with explicit disclaimers. The referral
extractor only reads what is visibly written and never infers diagnoses.

## WSL-Specific Notes

### Hot Module Reload (HMR)
Vite is configured with `watch.usePolling: true` and `interval: 500` to work
reliably in WSL2 where inotify events across the Windows filesystem are
unreliable. If you store the project inside the WSL filesystem (`/home/youruser/`)
rather than `/mnt/c/...`, you can remove the polling config for faster reloads.

### Windows filesystem vs WSL filesystem
**Strongly recommended:** Clone and run the project inside the WSL filesystem:
```bash
# Good — fast I/O, inotify works
~/projects/clearscan

# Avoid — slow I/O, polling required
/mnt/c/Users/yourname/projects/clearscan
```

### PostgreSQL in WSL
WSL2 does not use systemd by default. Use `service` commands:
```bash
sudo service postgresql start
sudo service postgresql stop
sudo service postgresql status
```

To start PostgreSQL automatically when WSL launches, add this to `~/.bashrc` or `~/.profile`:
```bash
# Auto-start PostgreSQL in WSL
sudo service postgresql status >/dev/null 2>&1 || sudo service postgresql start >/dev/null 2>&1
```

### Port access from Windows browser
All ports bound to `0.0.0.0` in WSL2 are accessible from Windows at
`http://localhost:<port>`. No extra configuration is needed.

---

## API Reference

See `docs/api.md` for the full REST API documentation.

Key endpoints:
- `POST /api/auth/login` — get JWT token
- `GET  /api/search?zip=75035&modality=MRI&radius=25` — search centers
- `POST /api/payments/create-checkout-session` — start Stripe checkout
- `POST /api/payments/webhook` — Stripe webhook (raw body)
- `GET  /api/admin/dashboard` — admin stats (requires admin JWT)
- `POST /api/admin/centers` — create imaging center (requires admin JWT)
