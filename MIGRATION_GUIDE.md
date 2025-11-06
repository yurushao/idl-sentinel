# Database Migration Guide

This guide will help you apply the necessary database migrations to add authentication and watchlist features to IDL Sentinel.

## Prerequisites

- Access to your Supabase dashboard
- SUPABASE_SERVICE_ROLE_KEY environment variable set
- JWT_SECRET environment variable set (already configured)

## Migrations to Apply

The following migration files need to be applied in order:

### 1. Migration 003: Add Authentication Users

**File:** `supabase/migrations/003_add_auth_users.sql`

This migration:
- Creates the `users` table for wallet-based authentication
- Adds `owner_id` column to `monitored_programs` table
- Sets up Row Level Security (RLS) policies for user-owned programs

### 2. Migration 004: Add Admin Role

**File:** `supabase/migrations/004_add_admin_role.sql`

This migration:
- Adds `is_admin` column to the `users` table
- Sets the specified wallet address as an admin
- Updates RLS policies to allow admin access to all programs

**Important:** Update the wallet address in line 10 to your admin wallet address before applying.

### 3. Migration 005: Add User Watchlist

**File:** `supabase/migrations/005_add_user_watchlist.sql`

This migration:
- Adds `slack_webhook_url` column to `users` table
- Creates the `user_watchlist` table for program subscriptions
- Updates RLS policies to restrict program management to admins only
- Sets up policies for watchlist management

### 4. Migration 006: Add Slack Notifications

**File:** `supabase/migrations/006_add_slack_notifications.sql`

This migration:
- Adds `slack_notified` and `slack_notified_at` columns to `idl_changes` table
- Creates indexes for efficient notification queries

## How to Apply Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. For each migration file (in order):
   - Copy the contents of the migration file
   - Paste it into the SQL Editor
   - Click "Run" to execute the migration
   - Verify there are no errors

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed and linked:

```bash
# Link your project (if not already linked)
npx supabase link --project-ref your-project-ref

# Push all migrations
npx supabase db push
```

### Option 3: Using the Migration Script (Alternative)

We've provided a script that attempts to apply migrations programmatically:

```bash
npx tsx scripts/apply-all-migrations.ts
```

**Note:** This method may have limitations depending on your Supabase configuration.

## Post-Migration Steps

After applying all migrations:

1. **Verify Tables Created:**
   - Check that the `users` and `user_watchlist` tables exist
   - Verify that new columns have been added to existing tables

2. **Verify RLS Policies:**
   - Check that Row Level Security is enabled on all tables
   - Verify that the policies are correctly configured

3. **Test Authentication:**
   - Connect your wallet on the application
   - Sign the authentication message
   - Verify that a user record is created in the `users` table

4. **Update Admin Wallet:**
   - If you haven't already, update the admin wallet address in migration 004
   - Or manually update the `users` table to set `is_admin = true` for your wallet

5. **Restart Your Development Server:**
   ```bash
   pnpm dev
   ```

## Verification Queries

Run these queries in the Supabase SQL Editor to verify the migrations:

```sql
-- Check if users table exists with correct columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users';

-- Check if user_watchlist table exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_watchlist';

-- Check if idl_changes has Slack notification columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'idl_changes'
AND column_name IN ('slack_notified', 'slack_notified_at');

-- Verify RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('users', 'user_watchlist', 'monitored_programs');

-- Check admin user
SELECT wallet_address, is_admin, created_at
FROM users
WHERE is_admin = true;
```

## Troubleshooting

### Error: "relation already exists"
This means the table or column already exists. You can safely skip that part of the migration or use `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`.

### Error: "must be owner of table"
Make sure you're using the service role key, not the anon key.

### RLS Policies Not Working
1. Verify that RLS is enabled on the table
2. Check that the `app.current_wallet` setting is being set correctly in your API routes
3. Review the policy definitions to ensure they match your requirements

### Admin Access Not Working
Run this query to manually set a user as admin:

```sql
UPDATE users
SET is_admin = true
WHERE wallet_address = 'YOUR_WALLET_ADDRESS';
```

## New Features Enabled

After applying these migrations, the following features will be available:

✅ **Wallet-based Authentication**
- Users can connect their Solana wallet
- Sign messages to authenticate
- JWT-based session management

✅ **Admin Role**
- Admins can create, update, and delete programs
- Regular users can only watch programs

✅ **User Watchlist**
- Users can add programs to their personal watchlist
- Receive notifications only for watched programs

✅ **Slack Notifications**
- Users can configure their own Slack webhook URL
- Receive personalized notifications for their watched programs

✅ **Settings Page**
- Manage Slack webhook configuration
- View and manage watchlist
- Test notification delivery

## Support

If you encounter any issues during migration, please:
1. Check the Supabase logs for error details
2. Review the verification queries above
3. Consult the Supabase documentation
4. Open an issue in the repository
