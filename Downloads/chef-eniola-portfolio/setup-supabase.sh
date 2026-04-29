#!/bin/bash

# Supabase Setup Script
# This script helps you set up your Supabase project

echo "🚀 Supabase Setup Script"
echo "========================"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo ""
fi

echo "📝 Please provide your Supabase credentials:"
echo ""

# Prompt for Supabase URL
read -p "Enter your Supabase Project URL: " SUPABASE_URL
read -p "Enter your Supabase Anon Key: " SUPABASE_ANON_KEY

# Update .env file
sed -i.bak "s|VITE_SUPABASE_URL=.*|VITE_SUPABASE_URL=$SUPABASE_URL|" .env
sed -i.bak "s|VITE_SUPABASE_ANON_KEY=.*|VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY|" .env

# Remove backup file
rm -f .env.bak

echo ""
echo "✅ Environment variables updated!"
echo ""
echo "📊 Next steps:"
echo "1. Run the SQL migration in your Supabase dashboard:"
echo "   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql"
echo "   - Copy and paste the contents of 'supabase-schema.sql'"
echo "   - Click 'Run' to execute"
echo ""
echo "2. Create a storage bucket for videos:"
echo "   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/storage/buckets"
echo "   - Click 'New bucket'"
echo "   - Name: 'videos'"
echo "   - Make it public"
echo "   - Click 'Create bucket'"
echo ""
echo "3. Set up storage policies (run in SQL Editor):"
echo "   See the commented section in supabase-schema.sql"
echo ""
echo "4. Start your development server:"
echo "   npm run dev"
echo ""
echo "🎉 Setup complete! Your admin email is: oluwafemieniolavico@gmail.com"
