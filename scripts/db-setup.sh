#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ClearScan — PostgreSQL local setup (no Docker)
# Creates the DB user and database in a locally running PostgreSQL instance
# Usage: bash scripts/db-setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

DB_NAME="clearscan_db"
DB_USER="clearscan"
DB_PASS="clearscan_dev_password"

echo -e "${BLUE}Setting up PostgreSQL for ClearScan…${NC}"
echo ""

# Check PostgreSQL is running
if ! pg_isready -q 2>/dev/null; then
    echo -e "${YELLOW}PostgreSQL is not running. Starting it…${NC}"
    sudo service postgresql start || sudo systemctl start postgresql
    sleep 2
fi

echo -e "${BLUE}Creating database user '${DB_USER}'…${NC}"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 \
    && echo -e "${YELLOW}User '${DB_USER}' already exists — skipping${NC}" \
    || sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"

echo -e "${BLUE}Creating database '${DB_NAME}'…${NC}"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
    && echo -e "${YELLOW}Database '${DB_NAME}' already exists — skipping${NC}" \
    || sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

echo -e "${BLUE}Granting privileges…${NC}"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

echo -e "${BLUE}Enabling pgcrypto extension (for UUID generation)…${NC}"
sudo -u postgres psql -d "${DB_NAME}" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" 2>/dev/null || true

echo ""
echo -e "${GREEN}Database ready!${NC}"
echo "  Host:     localhost"
echo "  Port:     5432"
echo "  Database: ${DB_NAME}"
echo "  User:     ${DB_USER}"
echo "  Password: ${DB_PASS}"
echo ""
echo "Your DATABASE_URL:"
echo "  postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
echo ""
echo -e "${YELLOW}Make sure this matches backend/.env → DATABASE_URL${NC}"
