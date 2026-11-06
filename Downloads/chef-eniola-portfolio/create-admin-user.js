#!/usr/bin/env node

/**
 * Create Admin User Script
 *
 * This script creates the master admin user in Supabase.
 * Run this after setting up your database.
 *
 * Usage: node create-admin-user.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const adminEmail = process.env.MASTER_ADMIN_EMAIL || process.env.VITE_MASTER_ADMIN_EMAIL;
const adminPassword = process.env.MASTER_ADMIN_PASSWORD || process.env.VITE_MASTER_ADMIN_PASSWORD;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials in .env file');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!adminEmail || !adminPassword) {
  console.error('❌ Error: Missing admin credentials in .env file');
  console.error('Please set MASTER_ADMIN_EMAIL and MASTER_ADMIN_PASSWORD');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function createAdminUser() {
  console.log('🔐 Creating Admin User...\n');
  console.log('📧 Email:', adminEmail);
  console.log('');

  try {
    const { data: existingUser, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Failed to list users:', listError.message);
      throw listError;
    }

    if (existingUser?.users?.some(u => u.email === adminEmail)) {
      console.log('⚠️  Admin user already exists!');
      console.log('');
      console.log('You can now login with:');
      console.log(`Email: ${adminEmail}`);
      return;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
      },
    });

    if (error) {
      console.error('❌ Error creating admin user:', error.message);
      console.log('');
      console.log('💡 Alternative: Create user manually in Supabase Dashboard');
      console.log('1. Go to: Authentication → Users');
      console.log('2. Click "Add user"');
      console.log(`3. Email: ${adminEmail}`);
      console.log('4. Set the password from your local .env file');
      console.log('5. Auto Confirm User: Yes');
      return;
    }

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('📋 User Details:');
    console.log(`   ID: ${data.user?.id}`);
    console.log(`   Email: ${data.user?.email}`);
    console.log('');
    console.log('🎉 You can now login to the admin panel!');
    console.log('   URL: http://localhost:3000/admin');
    console.log(`   Email: ${adminEmail}`);

  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    console.log('');
    console.log('💡 Manual Setup Instructions:');
    console.log('1. Go to Supabase Dashboard → Authentication → Users');
    console.log('2. Click "Add user"');
    console.log(`3. Email: ${adminEmail}`);
    console.log('4. Set the password from your local .env file');
    console.log('5. Auto Confirm User: Yes');
    console.log('6. Click "Create user"');
  }
}

async function main() {
  console.log('🚀 Admin User Setup\n');
  console.log('📍 Supabase URL:', supabaseUrl);
  console.log('');

  await createAdminUser();
}

main();
