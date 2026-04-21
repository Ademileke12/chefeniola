#!/bin/bash

# Check Orders Script
# Quick database check using Supabase CLI

echo "🔍 Checking Orders Database..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not installed"
    echo "Install with: npm install -g supabase"
    exit 1
fi

echo "1. Recent Orders:"
echo "=================="
supabase db query "SELECT order_number, stripe_session_id, customer_email, status, created_at FROM orders ORDER BY created_at DESC LIMIT 5;"

echo ""
echo "2. Recent Webhook Logs:"
echo "======================="
supabase db query "SELECT source, event_type, processed, created_at FROM webhook_logs WHERE source = 'stripe' ORDER BY created_at DESC LIMIT 5;"

echo ""
echo "3. Order Count by Status:"
echo "========================="
supabase db query "SELECT status, COUNT(*) as count FROM orders GROUP BY status;"

echo ""
echo "✅ Check complete!"
echo ""
echo "To check a specific session ID, run:"
echo "supabase db query \"SELECT * FROM orders WHERE stripe_session_id = 'YOUR_SESSION_ID';\""
