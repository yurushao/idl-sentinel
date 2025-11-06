# Shared Telegram Bot Implementation

This document summarizes the changes made to implement a shared Telegram bot for easier user onboarding.

## Problem

Previously, users had to:
1. Create their own Telegram bot via @BotFather
2. Get the bot token
3. Find their chat ID using @userinfobot
4. Manually enter both values in Settings

This was complicated and error-prone.

## Solution

Implemented a shared bot approach where:
1. Admin creates ONE bot for the entire app
2. Users simply click a link to connect
3. No technical knowledge required

## Changes Made

### 1. Database Migration (`009_shared_telegram_bot.sql`)

```sql
-- Removed user-specific bot tokens
ALTER TABLE users DROP COLUMN telegram_bot_token;

-- Added telegram username for better UX
ALTER TABLE users ADD COLUMN telegram_username TEXT;
```

### 2. New Backend Components

#### Connection Token System (`src/lib/telegram/connection-tokens.ts`)
- Generates temporary tokens (10-minute expiration)
- Maps tokens to user IDs
- Single-use tokens for security

#### Telegram Webhook (`src/app/api/telegram/webhook/route.ts`)
- Receives updates from Telegram bot
- Handles `/start TOKEN` commands to link users
- Provides bot commands: `/help`, `/status`
- Sends confirmation messages

#### Connection API (`src/app/api/telegram/connect/route.ts`)
- Generates connection tokens for authenticated users
- Creates Telegram deep links: `https://t.me/BOTNAME?start=TOKEN`
- Returns link to frontend

### 3. Updated Notification System

**Modified Files:**
- `src/lib/notifications/telegram-user.ts`
  - Removed `botToken` from `TelegramUserConfig` interface
  - Updated to use shared bot token from environment
  - Simplified database queries (no more `telegram_bot_token` filtering)

### 4. Updated API Routes

**`src/app/api/user/settings/route.ts`:**
- **GET:** Returns `telegram_username` instead of `telegram_bot_token`
- **PUT:** Supports disconnecting Telegram (sets `telegram_chat_id` to null)
- **POST (test):** Tests shared bot (no longer needs token parameter)

### 5. Completely Redesigned Settings UI

**`src/components/settings/user-settings.tsx`:**

**Before (Manual Configuration):**
- Input fields for bot token and chat ID
- Manual test button
- Complex instructions

**After (One-Click Connection):**
- **Not connected:** "Connect Telegram" button → Opens Telegram → Click Start
- **Connected:** Shows username, Test button, Disconnect button
- Real-time polling to detect successful connection
- Auto-opens Telegram link in new tab

### 6. Updated TypeScript Interfaces

**`src/lib/supabase.ts`:**
```typescript
export interface User {
  // Removed:
  telegram_bot_token?: string | null

  // Added:
  telegram_username?: string | null

  // Kept:
  telegram_chat_id?: string | null
}
```

### 7. Environment Variables

**Added to `.env.example`:**
```bash
# Required for shared bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_BOT_USERNAME=your_bot_username
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Admin notifications (legacy)
TELEGRAM_CHAT_ID=your_admin_chat_id
```

## User Experience Comparison

### Before
1. Read Telegram bot creation guide
2. Open Telegram, find @BotFather
3. Create new bot, copy token
4. Find @userinfobot, get chat ID
5. Open IDL Sentinel settings
6. Paste both values
7. Test
8. Save

**Time:** 5-10 minutes, **Complexity:** High

### After
1. Click "Connect Telegram"
2. Click "Start" in Telegram
3. Done!

**Time:** 10 seconds, **Complexity:** Trivial

## Connection Flow Diagram

```
┌─────────────┐
│   User      │
│  (Browser)  │
└──────┬──────┘
       │ 1. Click "Connect Telegram"
       ▼
┌─────────────────────────┐
│ POST /api/telegram/     │
│       connect           │
└──────┬──────────────────┘
       │ 2. Generate token
       │ 3. Return t.me link
       ▼
┌──────────────┐
│   Telegram   │
│     App      │
└──────┬───────┘
       │ 4. User clicks "Start"
       │ 5. Bot receives /start TOKEN
       ▼
┌─────────────────────────┐
│ POST /api/telegram/     │
│      webhook            │
└──────┬──────────────────┘
       │ 6. Verify token
       │ 7. Update user.telegram_chat_id
       │ 8. Send confirmation
       ▼
┌─────────────┐
│   Database  │
│   Updated   │
└─────────────┘
```

## Notification Flow (Unchanged)

The actual notification sending logic remains the same:

1. Cron job detects changes
2. Query users watching affected programs
3. Filter users with `telegram_chat_id` (now set via connection)
4. Send notifications using shared `TELEGRAM_BOT_TOKEN`

## Security Considerations

1. **Connection Tokens:**
   - 10-minute expiration
   - Single-use
   - Cryptographically random (32 bytes)

2. **Webhook Security:**
   - No authentication on webhook (Telegram limitation)
   - Consider IP whitelisting in production
   - Tokens prevent unauthorized connections

3. **Data Privacy:**
   - Only stores chat_id and username
   - Users can disconnect anytime
   - All data deleted on disconnect

## Files Changed

### New Files
- `supabase/migrations/009_shared_telegram_bot.sql`
- `src/lib/telegram/connection-tokens.ts`
- `src/app/api/telegram/webhook/route.ts`
- `src/app/api/telegram/connect/route.ts`
- `TELEGRAM_SETUP.md`

### Modified Files
- `src/lib/notifications/telegram-user.ts`
- `src/app/api/user/settings/route.ts`
- `src/components/settings/user-settings.tsx`
- `src/lib/supabase.ts`
- `.env.example`

## Testing Checklist

- [ ] Apply migration 009
- [ ] Create bot via @BotFather
- [ ] Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME` in env
- [ ] Set webhook URL
- [ ] Test connection flow (click Connect → Start → see success)
- [ ] Test notification (add program to watchlist, trigger change)
- [ ] Test disconnection
- [ ] Test reconnection
- [ ] Test `/help` and `/status` commands

## Rollback Plan

If needed to rollback:

1. Keep migration 009 (telegram_username is optional)
2. Revert code changes to previous commit
3. Users will lose Telegram connections but data is safe

## Future Enhancements

1. **Better webhook security:** Validate request signatures
2. **Multi-language support:** Bot messages in different languages
3. **Notification preferences:** Let users choose severity levels
4. **Bot commands:** `/list` to see watchlist, `/add` to add programs
5. **Rich messages:** Use Telegram's inline keyboards for interactive notifications

## Migration Notes

- Existing users will see their Telegram as "not connected"
- They need to reconnect using the new flow
- Old `telegram_bot_token` data is dropped (safe to do)
- `telegram_chat_id` is preserved if user had it set
- But they still need to reconnect as we need the new flow

## Support

If users have issues:

1. Check webhook is set: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
2. Check logs at `/api/telegram/webhook`
3. Try disconnecting and reconnecting
4. Verify bot is not blocked by user
5. Check token hasn't expired (10 minutes)
