#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ClearScan — WSL Setup Script
# Run once after cloning: bash scripts/setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
success() { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Resolve the project root (one level up from scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

info "Project root: $PROJECT_ROOT"
echo ""

# ── 1. Check prerequisites ───────────────────────────────────────────────────
info "Checking prerequisites…"

command -v node >/dev/null 2>&1 || error "Node.js not found. Install via: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
[ "$NODE_VER" -ge 18 ] || error "Node.js 18+ required. Found: $(node -v)"
success "Node.js $(node -v)"

command -v npm >/dev/null 2>&1 || error "npm not found"
success "npm $(npm -v)"

command -v psql >/dev/null 2>&1 || warn "psql not found – needed for manual DB setup (optional if using Docker)"

# ── 2. Backend .env ──────────────────────────────────────────────────────────
info "Setting up backend environment…"
if [ ! -f "$BACKEND_DIR/.env" ]; then
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    success "Created backend/.env from example"
    warn "⚠  Edit backend/.env and add your STRIPE_SECRET_KEY and other secrets before running"
else
    success "backend/.env already exists — skipping"
fi

# ── 3. Frontend .env ─────────────────────────────────────────────────────────
info "Setting up frontend environment…"
if [ ! -f "$FRONTEND_DIR/.env" ]; then
    cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env"
    success "Created frontend/.env from example"
    warn "⚠  Edit frontend/.env and add your VITE_STRIPE_PUBLISHABLE_KEY"
else
    success "frontend/.env already exists — skipping"
fi

# ── 4. Install dependencies ──────────────────────────────────────────────────
info "Installing backend dependencies…"
cd "$BACKEND_DIR" && npm install
success "Backend dependencies installed"

info "Installing frontend dependencies…"
cd "$FRONTEND_DIR" && npm install
success "Frontend dependencies installed"

# ── 5. Done ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  1. Edit backend/.env  → add STRIPE_SECRET_KEY, GOOGLE_MAPS_API_KEY"
echo "  2. Edit frontend/.env → add VITE_STRIPE_PUBLISHABLE_KEY"
echo ""
echo "Then choose a run method:"
echo ""
echo -e "  ${BLUE}Option A — Docker (recommended):${NC}"
echo "    docker compose -f docker/docker-compose.yml up --build"
echo ""
echo -e "  ${BLUE}Option B — Manual (PostgreSQL must be running):${NC}"
echo "    bash scripts/dev.sh"
echo ""
