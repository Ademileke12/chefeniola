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

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const adminEmail = process.env.VITE_MASTER_ADMIN_EMAIL || 'oluwafemieniolavico@gmail.com';
const adminPassword = process.env.VITE_MASTER_ADMIN_PASSWORD || 'Semilore1';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials in .env file');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdminUser() {
  console.log('🔐 Creating Admin User...\n');
  console.log('📧 Email:', adminEmail);
  console.log('🔑 Password:', adminPassword);
  console.log('');

  try {
    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    
    if (existingUser?.users?.some(u => u.email === adminEmail)) {
      console.log('⚠️  Admin user already exists!');
      console.log('');
      console.log('You can now login with:');
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
      return;
    }

    // Create the admin user
    const { data, error } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        emailRedirectTo: `${supabaseUrl}/admin`,
      }
    });

    if (error) {
      console.error('❌ Error creating admin user:', error.message);
      console.log('');
      console.log('💡 Alternative: Create user manually in Supabase Dashboard');
      console.log('1. Go to: Authentication → Users');
      console.log('2. Click "Add user"');
      console.log(`3. Email: ${adminEmail}`);
      console.log(`4. Password: ${adminPassword}`);
      console.log('5. Auto Confirm User: Yes');
      return;
    }

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('📋 User Details:');
    console.log(`   ID: ${data.user?.id}`);
    console.log(`   Email: ${data.user?.email}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Check your email to confirm the account');
    console.log('   Or enable "Auto Confirm Users" in Supabase Dashboard');
    console.log('');
    console.log('🎉 You can now login to the admin panel!');
    console.log(`   URL: http://localhost:3000/admin`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);

  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    console.log('');
    console.log('💡 Manual Setup Instructions:');
    console.log('1. Go to Supabase Dashboard → Authentication → Users');
    console.log('2. Click "Add user"');
    console.log(`3. Email: ${adminEmail}`);
    console.log(`4. Password: ${adminPassword}`);
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
