# Supabase Database Setup

This directory contains the database schema for IDL Sentinel.

## Quick Setup

### Option 1: Using Supabase Dashboard (Recommended)

1. **Create a new Supabase project** at [https://supabase.com](https://supabase.com)

2. **Open the SQL Editor** in your Supabase dashboard

3. **Copy and paste** the contents of `schema.sql` into the SQL editor

4. **Click "Run"** to execute the schema

5. **Set up your admin user**:
   - First, sign in to your app with your wallet
   - Then run this in the SQL editor:
   ```sql
   UPDATE users SET is_admin = true
   WHERE wallet_address = 'YOUR_WALLET_ADDRESS';
   ```

### Option 2: Using Supabase CLI

1. **Link to your project**:
   ```bash
   npx supabase link --project-ref your-project-ref
   ```

2. **Apply the schema** (if fresh database):
   - Run the contents of `schema.sql` in the Supabase SQL Editor
   - Or use the CLI after creating an initial migration from schema.sql

Note: The CLI is primarily used for syncing schema changes, not initial setup.

## Database Schema Overview

The database consists of the following tables:

### Core Tables

- **users**: Authenticated users with wallet addresses
  - Stores wallet addresses, admin status, and notification preferences
  - Each user can configure Slack and Telegram notifications

- **monitored_programs**: Solana programs being monitored
  - Only admins can create/update/delete programs
  - Regular users can watch programs via the watchlist

- **idl_snapshots**: Historical IDL versions
  - Stores complete IDL JSON for each snapshot
  - Uses SHA-256 hash for change detection

- **idl_changes**: Detected changes between versions
  - Categorized by severity (low, medium, high, critical)
  - Tracks notification status for different channels

### Supporting Tables

- **user_watchlist**: Programs users are subscribed to
  - Users receive notifications only for watched programs

- **telegram_connection_tokens**: Temporary auth tokens
  - Used for Telegram bot authentication flow

- **monitoring_logs**: System logs
  - Debugging and monitoring information

## Schema Management

The `schema.sql` file is the **single source of truth** for the database schema. It contains the complete, final state of all tables, indexes, policies, triggers, and functions.

### For New Deployments (Fresh Setup)

**If you're cloning the repo and setting up a new database:**

Simply run `schema.sql` in your Supabase SQL Editor - this creates the entire database schema in one go, including all optimizations.

**DO NOT** run the migration files - they are only for existing deployments.

```sql
-- In Supabase SQL Editor, copy and paste the entire contents of:
-- supabase/schema.sql
```

### For Existing Deployments (Upgrading)

**If you already have a running database and want to apply the latest optimizations:**

Run the migration file `migration_production_optimizations.sql` which adds:
- Performance indexes
- Optimized database functions

```sql
-- In Supabase SQL Editor, copy and paste the entire contents of:
-- supabase/migration_production_optimizations.sql
```

### Files in This Directory

- **`schema.sql`** - Complete database schema (use for fresh setup)
- **`migration_production_optimizations.sql`** - Migration for existing databases (adds indexes and functions)
- **`README.md`** - This file

### For Schema Updates

When making changes to the database:

1. Update `schema.sql` to reflect the new desired state
2. Use Supabase CLI to sync changes:
   ```bash
   # Link to your project (first time only)
   npx supabase link --project-ref your-project-ref

   # Pull current remote schema to see what changed
   npx supabase db pull

   # Review the generated migration, then push it
   npx supabase db push
   ```

### Migrations Directory

The `migrations/` directory is **not used** in this project. All schema changes should be made by updating `schema.sql` and using the Supabase CLI to sync.

## Security

### Row Level Security (RLS)

All tables have RLS enabled with the following policies:

- **Read access**: Most tables allow public read access
- **Write access**: Varies by table
  - Users can only modify their own data
  - Only admins can manage monitored programs
  - System operations use service role

### Environment Configuration

The app uses `app.current_wallet` setting to track the authenticated user's wallet address. This is set by the API routes during authenticated requests.

## Troubleshooting

### Issue: Policies not working

Make sure you're setting the `app.current_wallet` configuration in your API routes:

```typescript
await supabase.rpc('set_config', {
  name: 'app.current_wallet',
  value: walletAddress
})
```

### Issue: Permission denied

Check that:
1. RLS is enabled on the table
2. Appropriate policies exist
3. You're using the correct Supabase client (with service role key for admin operations)

### Issue: Missing tables

Ensure you've run the complete `schema.sql` file in order, without errors.

## Backups

Supabase automatically backs up your database daily. You can also:

1. Export your database from the Supabase dashboard
2. Use `pg_dump` with your database credentials
3. Use the Supabase CLI: `supabase db dump`

## Support

For issues specific to:
- **Supabase**: Check [Supabase docs](https://supabase.com/docs)
- **IDL Sentinel**: Create an issue on GitHub
