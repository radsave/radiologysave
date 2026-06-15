#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ClearScan — Manual dev runner (no Docker)
# Requires: PostgreSQL running locally, .env files configured
# Usage: bash scripts/dev.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# ── Pre-flight checks ────────────────────────────────────────────────────────
[ -f "$BACKEND_DIR/.env" ]  || { echo -e "${RED}Missing backend/.env — run setup.sh first${NC}"; exit 1; }
[ -f "$FRONTEND_DIR/.env" ] || { echo -e "${RED}Missing frontend/.env — run setup.sh first${NC}"; exit 1; }

# ── Run migrations & seeds ───────────────────────────────────────────────────
echo -e "${BLUE}[DB]${NC} Running migrations…"
cd "$BACKEND_DIR" && npx knex migrate:latest
echo -e "${GREEN}[DB]${NC} Migrations complete"

echo -e "${BLUE}[DB]${NC} Running seeds…"
npx knex seed:run
echo -e "${GREEN}[DB]${NC} Seeds complete"

# ── Start backend and frontend in parallel ───────────────────────────────────
echo ""
echo -e "${GREEN}Starting ClearScan…${NC}"
echo -e "  Backend  → http://localhost:4000"
echo -e "  Frontend → http://localhost:5173"
echo -e "  Admin    → http://localhost:5173/admin"
echo ""
echo "Press Ctrl+C to stop all processes."
echo ""

# Use 'trap' to kill both child processes on Ctrl+C
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down…${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}
trap cleanup INT TERM

# Start backend
cd "$BACKEND_DIR" && npm run dev &
BACKEND_PID=$!

# Small delay so backend starts before frontend tries to proxy
sleep 2

# Start frontend
cd "$FRONTEND_DIR" && npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!

# Wait for either process to exit
wait $BACKEND_PID $FRONTEND_PID
