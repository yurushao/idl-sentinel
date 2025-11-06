# Cleanup Notes - notification_settings Table Removal

## What Was Removed

### 1. **Database Table**
- `notification_settings` table (stored global Telegram config)

### 2. **API Routes**
- `/api/notifications/settings` (GET, PUT)
- `/api/notifications/send`
- `/api/notifications/test`

### 3. **Components**
- `src/components/settings/notification-settings.tsx` (old settings UI)

### 4. **TypeScript Types**
- `NotificationSetting` interface

## Why It Was Removed

**Before:**
- Global `notification_settings` table stored Telegram config
- All users received the same notifications
- Single Telegram channel for all alerts

**After:**
- **Telegram:** Configured via environment variables (admin/global notifications)
- **Slack:** Each user configures their own webhook URL (personalized notifications)
- Users only receive notifications for programs they watch

## Migration Path

### For Telegram (Optional - Admin Notifications)

**Old way (database):**
```sql
INSERT INTO notification_settings (setting_key, setting_value, is_active)
VALUES ('telegram_bot_token', 'xxx', true);
```

**New way (environment variables):**
```bash
# .env.local
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### For User Notifications

**Old way:**
- Everyone gets notifications to the same Telegram channel

**New way:**
- Each user configures their own Slack webhook in Settings
- Notifications are personalized based on watchlist

## Database Migration

Run this SQL to drop the table:

```sql
-- See: supabase/migrations/007_drop_notification_settings.sql
DROP TABLE IF EXISTS notification_settings CASCADE;
```

## Environment Variables

Update your `.env.local`:

```bash
# Optional: For admin/global Telegram notifications
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Required: For user authentication
JWT_SECRET=your_jwt_secret_at_least_32_characters

# Users configure their own Slack webhooks in the UI (no env vars needed)
```

## What Still Works

✅ **Telegram notifications** (optional, for admins)
- Configure via environment variables
- Sends to a global channel
- All IDL changes are notified

✅ **Slack notifications** (personalized, for users)
- Each user configures their own webhook in Settings
- Only receives notifications for watched programs
- Fully private and personalized

## Testing

After cleanup:

1. **Test Telegram** (if configured):
   ```bash
   # Ensure env vars are set
   echo $TELEGRAM_BOT_TOKEN
   echo $TELEGRAM_CHAT_ID

   # Trigger cron job
   curl -X GET http://localhost:3000/api/cron/monitor-idls \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

2. **Test Slack** (user-specific):
   - Go to Settings
   - Configure your Slack webhook
   - Add programs to watchlist
   - Wait for IDL changes or trigger monitoring

## Benefits of This Change

1. **🔒 Better Security**
   - No sensitive tokens in database
   - Environment variables are server-side only

2. **👥 User Privacy**
   - Each user has their own notifications
   - No shared channels

3. **⚡ Simpler Architecture**
   - Fewer database tables
   - Less API complexity
   - Easier to maintain

4. **🎯 Personalized Notifications**
   - Users only get alerts for programs they care about
   - Can configure their own Slack workspace

## Rollback (If Needed)

If you need to rollback, restore from:
- `supabase/migrations/001_initial_schema.sql` (has notification_settings)
- Git history: `git log -- src/app/api/notifications/`

But the new system is better! 🎉
