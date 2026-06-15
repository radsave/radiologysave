#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ClearScan — Install all system dependencies on WSL (Ubuntu/Debian)
# Run once as a user with sudo: bash scripts/install-deps-wsl.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  ClearScan — WSL Dependency Installer         ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

# ── Update apt ───────────────────────────────────────────────────────────────
echo -e "${BLUE}[1/5]${NC} Updating apt packages…"
sudo apt-get update -qq

# ── Install system tools ─────────────────────────────────────────────────────
echo -e "${BLUE}[2/5]${NC} Installing system tools (curl, git, build-essential)…"
sudo apt-get install -y -qq curl git build-essential ca-certificates gnupg lsb-release

# ── Node.js 20 LTS ──────────────────────────────────────────────────────────
echo -e "${BLUE}[3/5]${NC} Installing Node.js 20 LTS…"
if command -v node >/dev/null 2>&1 && [ "$(node -v | sed 's/v//' | cut -d. -f1)" -ge 18 ]; then
    echo -e "${GREEN}       Node.js $(node -v) already installed — skipping${NC}"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - >/dev/null 2>&1
    sudo apt-get install -y -qq nodejs
    echo -e "${GREEN}       Node.js $(node -v) installed${NC}"
fi

# ── PostgreSQL 16 ────────────────────────────────────────────────────────────
echo -e "${BLUE}[4/5]${NC} Installing PostgreSQL 16…"
if command -v psql >/dev/null 2>&1; then
    echo -e "${GREEN}       PostgreSQL $(psql --version | awk '{print $3}') already installed — skipping${NC}"
else
    # Add PostgreSQL apt repo
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | \
        sudo gpg --dearmor -o /etc/apt/keyrings/postgresql.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/postgresql.gpg] \
        https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | \
        sudo tee /etc/apt/sources.list.d/pgdg.list >/dev/null
    sudo apt-get update -qq
    sudo apt-get install -y -qq postgresql-16 postgresql-client-16
    echo -e "${GREEN}       PostgreSQL 16 installed${NC}"

    # Start PostgreSQL (WSL doesn't use systemd by default)
    echo -e "${BLUE}       Starting PostgreSQL service…${NC}"
    sudo service postgresql start || true
fi

# ── Docker (optional, for docker compose option) ─────────────────────────────
echo -e "${BLUE}[5/5]${NC} Checking Docker…"
if command -v docker >/dev/null 2>&1; then
    echo -e "${GREEN}       Docker $(docker --version | awk '{print $3}' | tr -d ',') already installed${NC}"
else
    echo -e "${YELLOW}       Docker not found. To install Docker Desktop for WSL2:${NC}"
    echo "       https://docs.docker.com/desktop/wsl/"
    echo ""
    echo -e "${YELLOW}       Or install Docker Engine directly in WSL:${NC}"
    echo "       curl -fsSL https://get.docker.com | sudo sh"
    echo "       sudo usermod -aG docker \$USER"
    echo "       (then log out and back in)"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  All dependencies installed!                  ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo "Node.js: $(node -v)"
echo "npm:     $(npm -v)"
echo "psql:    $(psql --version 2>/dev/null | head -1 || echo 'not found')"
echo ""
echo -e "${BLUE}Next:${NC} bash scripts/setup.sh"
