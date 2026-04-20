#!/bin/bash

# Migration 013: Add stripe_session_id index
# This script runs the migration using psql directly to avoid transaction issues

set -e

echo "🚀 Starting migration 013: Add stripe_session_id index"
echo "============================================================"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found"
    exit 1
fi

# Load environment variables
source .env.local

# Extract database connection details from Supabase URL
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ Error: NEXT_PUBLIC_SUPABASE_URL not set"
    exit 1
fi

# Check if migration file exists
MIGRATION_FILE="supabase/migrations/013_add_stripe_session_id_index.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "📄 Migration file found"
echo ""
echo "📋 Migration SQL:"
echo "============================================================"
cat "$MIGRATION_FILE"
echo "============================================================"
echo ""

# Check if psql is available
if command -v psql &> /dev/null; then
    echo "✅ psql found, attempting direct execution..."
    echo ""
    echo "⚠️  Note: You need to provide your database connection string"
    echo "   Format: postgresql://user:password@host:port/database"
    echo ""
    read -p "Enter your database connection string (or press Enter to skip): " DB_URL
    
    if [ -n "$DB_URL" ]; then
        echo ""
        echo "⚙️  Executing migration..."
        psql "$DB_URL" -f "$MIGRATION_FILE"
        echo ""
        echo "✅ Migration executed successfully!"
    else
        echo ""
        echo "⏭️  Skipping direct execution"
    fi
else
    echo "⚠️  psql not found"
fi

echo ""
echo "📝 Manual execution steps:"
echo "   1. Go to your Supabase dashboard"
echo "   2. Navigate to SQL Editor"
echo "   3. Copy and paste the SQL from: $MIGRATION_FILE"
echo "   4. Click 'Run' to execute"
echo ""
echo "   Or use Supabase CLI: supabase db push"
echo ""
echo "✅ After running the migration, verify with:"
echo "   npx tsx scripts/run-migration-013.ts"
