#!/bin/bash

# Quick database setup script for Mono Waves E-Commerce

echo "🚀 Setting up Mono Waves database..."
echo ""

# Get database URL from .env.local
if [ -f .env.local ]; then
  export $(cat .env.local | grep DATABASE_URL | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL not set"
  echo "Please set DATABASE_URL in .env.local"
  exit 1
fi

echo "📊 Database: $DATABASE_URL"
echo ""

# Function to run migration
run_migration() {
  local file=$1
  local description=$2
  
  if [ -f "$file" ]; then
    echo "▶️  $description"
    if psql "$DATABASE_URL" -f "$file" > /dev/null 2>&1; then
      echo "   ✅ Success"
    else
      echo "   ⚠️  Warning (may already exist or not applicable)"
    fi
  else
    echo "   ⏭️  Skipped (file not found)"
  fi
  echo ""
}

# Run migrations in order
echo "Running migrations..."
echo ""

run_migration "supabase/migrations/001_initial_schema.sql" "1. Creating base schema (users, products, orders, carts, webhooks)"
run_migration "supabase/migrations/002_create_missing_tables.sql" "2. Creating any missing tables (idempotent)"
run_migration "supabase/migrations/003_add_design_data_field.sql" "3. Adding design_data field"
run_migration "supabase/migrations/004_update_product_schema_for_ai_mockups.sql" "4. Updating product schema for AI mockups"
run_migration "supabase/migrations/005_make_deprecated_columns_nullable.sql" "5. Making deprecated columns nullable"
run_migration "supabase/migrations/006_performance_optimization.sql" "6. Performance optimization"
run_migration "supabase/migrations/007_create_support_tickets_table.sql" "7. Creating support tickets table"
run_migration "supabase/migrations/008_add_tax_column_to_orders.sql" "8. Adding tax column to orders (ORDER FULFILLMENT)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verify setup
echo "🔍 Verifying database setup..."
echo ""

# Check if orders table exists and has tax column
if psql "$DATABASE_URL" -c "\d orders" > /dev/null 2>&1; then
  echo "✅ Orders table exists"
  
  # Check for tax column
  if psql "$DATABASE_URL" -c "\d orders" | grep -q "tax"; then
    echo "✅ Tax column exists in orders table"
  else
    echo "❌ Tax column NOT found in orders table"
    echo "   Try running migration 008 manually:"
    echo "   psql \$DATABASE_URL -f supabase/migrations/008_add_tax_column_to_orders.sql"
  fi
else
  echo "❌ Orders table NOT found"
  echo "   Try running migrations 001 and 002 manually"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✨ Database setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start dev server: npm run dev"
echo "  2. Test the application: see FRONTEND_TESTING_GUIDE.md"
echo ""
