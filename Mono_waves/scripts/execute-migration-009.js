/**
 * Execute migration 009 using Supabase Management API
 * This script reads the SQL file and executes it via HTTP request
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Read the migration file
const migrationPath = path.join(__dirname, '../supabase/migrations/009_create_gelato_availability_tables.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

console.log('🚀 Executing migration 009: Create Gelato Availability Tables\n');
console.log('📄 Migration file loaded');
console.log(`📊 SQL length: ${migrationSQL.length} characters\n`);

// Parse the Supabase URL to get the project ref
const urlParts = new URL(supabaseUrl);
const projectRef = urlParts.hostname.split('.')[0];

console.log(`🔗 Project: ${projectRef}`);
console.log(`🌐 URL: ${supabaseUrl}\n`);

// Prepare the request
const postData = JSON.stringify({
  query: migrationSQL
});

const options = {
  hostname: urlParts.hostname,
  port: 443,
  path: '/rest/v1/rpc/exec',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'apikey': supabaseServiceKey,
    'Authorization': `Bearer ${supabaseServiceKey}`
  }
};

console.log('📡 Sending request to Supabase...\n');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ Migration executed successfully!\n');
      console.log('📋 Next steps:');
      console.log('  1. Run: npx tsx scripts/verify-gelato-tables.ts');
      console.log('  2. Verify tables in Supabase Dashboard');
      console.log('  3. Continue with Task 2 (Implement cache manager)\n');
    } else {
      console.error(`❌ Migration failed with status ${res.statusCode}`);
      console.error('Response:', data);
      console.log('\n📝 Please run the migration manually:');
      console.log('  1. Go to Supabase Dashboard > SQL Editor');
      console.log('  2. Copy contents of supabase/migrations/009_create_gelato_availability_tables.sql');
      console.log('  3. Paste and execute in SQL Editor\n');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.log('\n📝 Please run the migration manually:');
  console.log('  1. Go to Supabase Dashboard > SQL Editor');
  console.log('  2. Copy contents of supabase/migrations/009_create_gelato_availability_tables.sql');
  console.log('  3. Paste and execute in SQL Editor\n');
});

req.write(postData);
req.end();
