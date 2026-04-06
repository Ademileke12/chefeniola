#!/bin/bash

# Stripe Webhook Setup Script for Local Development
# This script helps you set up Stripe CLI for local webhook forwarding

set -e

echo "=================================="
echo "Stripe Webhook Setup for Local Dev"
echo "=================================="
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI is not installed."
    echo ""
    echo "Please install it first:"
    echo ""
    echo "macOS:"
    echo "  brew install stripe/stripe-cli/stripe"
    echo ""
    echo "Linux:"
    echo "  wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz"
    echo "  tar -xvf stripe_linux_x86_64.tar.gz"
    echo "  sudo mv stripe /usr/local/bin/"
    echo ""
    echo "Windows:"
    echo "  Download from: https://github.com/stripe/stripe-cli/releases"
    echo ""
    exit 1
fi

echo "✅ Stripe CLI is installed"
echo ""

# Check if logged in
if ! stripe config --list &> /dev/null; then
    echo "⚠️  You need to login to Stripe CLI first"
    echo ""
    echo "Running: stripe login"
    echo ""
    stripe login
    echo ""
fi

echo "✅ Logged in to Stripe"
echo ""

echo "=================================="
echo "Starting Webhook Forwarding"
echo "=================================="
echo ""
echo "This will forward Stripe webhooks to: http://localhost:3000/api/webhooks/stripe"
echo ""
echo "⚠️  IMPORTANT: Copy the webhook signing secret that appears below"
echo "   and update it in your .env.local file:"
echo ""
echo "   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx"
echo ""
echo "Then restart your dev server (npm run dev)"
echo ""
echo "Press Ctrl+C to stop forwarding"
echo ""
echo "=================================="
echo ""

# Start forwarding
stripe listen --forward-to localhost:3000/api/webhooks/stripe
