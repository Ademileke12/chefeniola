#!/bin/bash

# Quick script to check products in database

echo "🔍 Checking products in database..."
echo ""

# Get database URL from .env.local
if [ -f .env.local ]; then
  export $(cat .env.local | grep DATABASE_URL | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL not set"
  exit 1
fi

echo "📊 Total products in database:"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM products;" 2>/dev/null || echo "❌ Error querying database"

echo ""
echo "📊 Published products:"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM products WHERE published = true;" 2>/dev/null || echo "❌ Error querying database"

echo ""
echo "📋 Product list:"
psql "$DATABASE_URL" -c "SELECT id, name, price, published, created_at FROM products ORDER BY created_at DESC LIMIT 10;" 2>/dev/null || echo "❌ Error querying database"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 If you have 0 products, you need to:"
echo "   1. Go to http://localhost:3000/admin/products"
echo "   2. Click 'Add Product' or 'Import from Gelato'"
echo "   3. Create and publish products"
echo ""
