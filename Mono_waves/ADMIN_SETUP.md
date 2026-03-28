# Admin Panel Setup Guide

## Overview
The Mono Waves admin panel allows you to manage products, orders, and other aspects of your e-commerce platform.

## Prerequisites

Before setting up the admin panel, make sure you have:

1. **Database Schema**: Run the database migration (see [DATABASE_SETUP.md](./DATABASE_SETUP.md))
2. **Storage Bucket**: Create the `designs` storage bucket (see [STORAGE_SETUP.md](./STORAGE_SETUP.md))
3. **Supabase Account**: Active Supabase project with authentication enabled
4. **Environment Variables**: Configured in `.env.local`

## Accessing the Admin Panel

### URL
- **Development**: `http://localhost:3000/admin/login`
- **Production**: `https://your-domain.com/admin/login`

## Setting Up Admin Access

### Step 1: Create Admin User in Supabase

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add User** (or **Invite User**)
4. Enter the admin email (must match `ADMIN_EMAIL` in `.env.local`)
5. Set a secure password
6. Click **Create User**

### Step 2: Configure Environment Variables

Make sure your `.env.local` file has the following variables:

```bash
# Admin Configuration
ADMIN_EMAIL=admin@example.com
NEXT_PUBLIC_ADMIN_EMAIL=admin@example.com
```

**Important**: Both variables should have the same email address. The `NEXT_PUBLIC_` prefix makes it accessible on the client side.

### Step 3: Update Admin Email (Optional)

If you want to use a different admin email:

1. Update both `ADMIN_EMAIL` and `NEXT_PUBLIC_ADMIN_EMAIL` in `.env.local`
2. Create a user in Supabase with that email
3. Restart your development server

## Logging In

1. Navigate to `/admin/login`
2. Enter your admin email and password
3. Click **Sign In**
4. You'll be redirected to the admin dashboard

## Features

Once logged in, you can access:

- **Dashboard**: View sales metrics, revenue, and order statistics
- **Products**: Manage product catalog, add/edit/delete products
- **Orders**: View and manage customer orders
- **Designs**: Manage design files for products
- **Settings**: Configure platform settings

## Logging Out

Click the **Logout** button at the bottom of the sidebar to sign out.

## Security Notes

- Only users with the exact email matching `ADMIN_EMAIL` can access the admin panel
- All other users will be automatically signed out and redirected to the login page
- Admin sessions are managed by Supabase Auth
- Always use strong passwords for admin accounts

## Troubleshooting

### "You do not have admin privileges"
- Verify that your email in Supabase matches `ADMIN_EMAIL` in `.env.local` exactly
- Check for typos or extra spaces

### "Invalid or expired token"
- Your session may have expired
- Try logging in again

### Can't access admin panel after login
- Make sure you've restarted your development server after changing `.env.local`
- Clear your browser cache and cookies
- Check the browser console for errors

## Default Credentials

For development/testing, the default admin email is set to:
- **Email**: `admin@example.com`
- **Password**: Set this when creating the user in Supabase

**Remember to change this for production!**

## Production Deployment

Before deploying to production:

1. Create a production admin user in your production Supabase project
2. Update environment variables in your hosting platform (Vercel, etc.)
3. Use a strong, unique password
4. Consider enabling 2FA in Supabase for additional security


## Gelato API Configuration

The platform integrates with Gelato's print-on-demand API for product fulfillment.

### Setting Up Gelato API

1. Sign up for a Gelato account at [https://dashboard.gelato.com](https://dashboard.gelato.com)
2. Generate your API credentials from the dashboard
3. Add them to your `.env.local` file:

```bash
# Gelato API (Print-on-Demand)
GELATO_API_KEY=your-api-key:your-api-secret
GELATO_WEBHOOK_SECRET=your-webhook-secret
```

**Important**: The `GELATO_API_KEY` must be in the format `apiKey:apiSecret` (colon-separated).

### Gelato API Endpoints

The application uses two Gelato API services:
- **Product API** (`https://product.gelatoapis.com`) - Browse product catalogs and variants
- **Order API** (`https://order.gelatoapis.com`) - Create and manage print orders

Authentication is done via the `X-API-KEY` header with your full API key.

### Testing Gelato Integration

To verify your Gelato API configuration:

1. Navigate to `http://localhost:3000/api/gelato/test`
2. You should see a JSON response with `responseOk: true` and a list of available catalogs
3. If you see errors, check that your API key is correct and in the proper format

### Troubleshooting Gelato API

**"Failed to Load Product Catalog"**
- Verify `GELATO_API_KEY` is in the correct format (`apiKey:apiSecret`)
- Test the connection at `/api/gelato/test`
- Ensure your API key is valid in the Gelato Dashboard
- Check that you're using the correct environment (test vs. production) keys

**"Missing Authentication Token"**
- Your API key format may be incorrect
- Make sure there are no extra spaces or line breaks in the `.env.local` file
- Restart your development server after changing environment variables


## Supabase Storage Setup

Before you can upload design files, you need to create a storage bucket in Supabase.

### Quick Setup

1. Go to your Supabase project dashboard
2. Navigate to **Storage** → **New bucket**
3. Create a bucket named `designs` (make it public)
4. Set up the required policies

For detailed instructions, see [STORAGE_SETUP.md](./STORAGE_SETUP.md).

### Troubleshooting File Uploads

**"Failed to upload file to storage"**
- The `designs` storage bucket doesn't exist in Supabase
- Follow the instructions in [STORAGE_SETUP.md](./STORAGE_SETUP.md) to create it

**"Bucket not found"**
- Make sure the bucket name is exactly `designs` (lowercase)
- Verify the bucket exists in your Supabase Storage dashboard
