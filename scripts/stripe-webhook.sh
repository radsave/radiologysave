#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ClearScan — Start Stripe webhook listener (for local dev)
# Requires: Stripe CLI installed
# Install:  https://stripe.com/docs/stripe-cli#install
#
# On WSL (Ubuntu):
#   curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public \
#     | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg >/dev/null
#   echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" \
#     | sudo tee /etc/apt/sources.list.d/stripe.list
#   sudo apt update && sudo apt install stripe
# ─────────────────────────────────────────────────────────────────────────────
set -e

command -v stripe >/dev/null 2>&1 || {
    echo "Stripe CLI not found. Install it:"
    echo "  curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public \\"
    echo "    | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg >/dev/null"
    echo "  echo \"deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main\" \\"
    echo "    | sudo tee /etc/apt/sources.list.d/stripe.list"
    echo "  sudo apt update && sudo apt install stripe"
    exit 1
}

echo "Starting Stripe webhook forwarder → http://localhost:4000/api/payments/webhook"
echo "Copy the webhook signing secret below into backend/.env → STRIPE_WEBHOOK_SECRET"
echo ""

stripe listen --forward-to http://localhost:4000/api/payments/webhook
