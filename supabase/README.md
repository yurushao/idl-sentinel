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

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Link to your project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **Run the schema**:
   ```bash
   supabase db reset
   ```

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

## Migrations

The `migrations/` directory contains individual migration files showing the evolution of the schema. These are **for reference only** - new deployments should use `schema.sql` directly.

Migration history:
- `001_initial_schema.sql` - Initial tables and indexes
- `002_grant_permissions.sql` - Set up permissions
- `003_add_auth_users.sql` - Added users table
- `004_add_admin_role.sql` - Added admin functionality
- `005_add_user_watchlist.sql` - Added watchlist feature
- `006_add_slack_notifications.sql` - Added Slack support
- `007_drop_notification_settings.sql` - Removed legacy table
- `008_add_user_telegram.sql` - Added Telegram support
- `009_shared_telegram_bot.sql` - Switched to shared bot model
- `010_telegram_connection_tokens.sql` - Added connection tokens

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
