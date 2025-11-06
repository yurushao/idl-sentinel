# Telegram Bot Setup Guide

This guide explains how to set up the shared Telegram bot for IDL Sentinel notifications.

## Overview

IDL Sentinel uses a **shared bot approach** where:
- The admin creates ONE Telegram bot for the entire application
- Users simply click a link to connect their Telegram account
- No need for users to create their own bots or find their chat IDs

## Step 1: Create a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Start a chat with BotFather and send `/newbot`
3. Follow the prompts:
   - Choose a name (e.g., "IDL Sentinel")
   - Choose a username (e.g., "idlsentinel_bot")
4. BotFather will give you:
   - Bot token (e.g., `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
   - Bot username (e.g., `idlsentinel_bot`)

## Step 2: Configure Environment Variables

Add these to your `.env.local`:

```bash
# Required: Bot token from @BotFather
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# Required: Bot username (without @)
TELEGRAM_BOT_USERNAME=idlsentinel_bot

# Required: Your app URL (for connection links)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL

# Optional: Admin chat for legacy notifications
TELEGRAM_CHAT_ID=your_chat_id
```

## Step 3: Set Up Telegram Webhook

For the bot to receive messages (like `/start` commands), you need to set up a webhook:

### For Production (Vercel, etc.)

```bash
# Replace with your values
BOT_TOKEN="your_bot_token"
WEBHOOK_URL="https://yourdomain.com/api/telegram/webhook"

# Set the webhook
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${WEBHOOK_URL}\"}"
```

### For Local Development (using ngrok)

1. Install ngrok: `npm install -g ngrok`
2. Start your dev server: `pnpm dev`
3. In another terminal, start ngrok:
   ```bash
   ngrok http 3000
   ```
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. Set the webhook:
   ```bash
   BOT_TOKEN="your_bot_token"
   WEBHOOK_URL="https://abc123.ngrok.io/api/telegram/webhook"

   curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
     -H "Content-Type: application/json" \
     -d "{\"url\": \"${WEBHOOK_URL}\"}"
   ```

### Verify Webhook

Check that the webhook is set correctly:

```bash
curl "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"
```

You should see your webhook URL in the response.

## Step 4: Apply Database Migration

Run the migration to update the database schema:

```sql
-- In Supabase SQL Editor, run:
-- supabase/migrations/009_shared_telegram_bot.sql

ALTER TABLE users
DROP COLUMN IF EXISTS telegram_bot_token;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS telegram_username TEXT;
```

## Step 5: Test the Connection Flow

1. Sign in to your app
2. Go to Settings page
3. Click "Connect Telegram"
4. You should see a connection link
5. Click it to open Telegram
6. Click "Start" in the bot chat
7. You should see a success message
8. Back in the app, your Telegram should show as connected

## User Flow

Once set up, users can connect their Telegram in 3 simple steps:

1. **Click "Connect Telegram"** button in Settings
2. **Click "Start"** in the Telegram chat that opens
3. **Done!** They'll now receive notifications

## Bot Commands

The bot supports these commands:

- `/start <token>` - Connect account (auto-sent via connection link)
- `/help` - Show help message
- `/status` - Check connection status

## How It Works

### Connection Flow

1. User clicks "Connect Telegram" in Settings
2. Backend generates a temporary connection token (expires in 10 minutes)
3. User is redirected to `https://t.me/BOTNAME?start=TOKEN`
4. User clicks "Start" in Telegram
5. Bot receives `/start TOKEN` command
6. Bot validates token and links chat_id to user's wallet
7. Bot sends confirmation message
8. User sees "Connected" status in Settings

### Notification Flow

1. Cron job detects IDL changes
2. System finds all users watching the affected program
3. For each user with `telegram_chat_id` set:
   - Format notification message
   - Send via Telegram API using shared bot token
4. Mark changes as `telegram_user_notified: true`

## Troubleshooting

### Webhook Not Working

Check webhook info:
```bash
curl "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"
```

Delete webhook (for testing):
```bash
curl "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook"
```

### Connection Link Expired

Connection tokens expire after 10 minutes. User should:
1. Click "Connect Telegram" again to generate a new link
2. Complete the connection within 10 minutes

### Bot Not Responding

1. Check that webhook is set correctly
2. Check that `TELEGRAM_BOT_TOKEN` is correct
3. Check server logs for errors at `/api/telegram/webhook`

### Test Notification Fails

1. Verify user is connected (check `telegram_chat_id` in database)
2. Verify `TELEGRAM_BOT_TOKEN` is correct
3. Check that bot is not blocked by user

## Security Considerations

- Connection tokens are JWT-based, cryptographically signed, and expire after 10 minutes
- Tokens are one-time use (tracked by unique JWT ID)
- Bot token should be kept secret (never expose in client code)
- Webhook endpoint has no authentication (Telegram doesn't support webhook secrets well)
- For production, consider adding IP whitelisting for Telegram's IPs

### Why JWT Tokens?

Connection tokens use JWT (JSON Web Tokens) instead of random strings because:

1. **Serverless-friendly:** Works across multiple server instances (Vercel, AWS Lambda, etc.)
2. **Stateless:** No database or Redis needed for token storage
3. **Self-contained:** Token includes userId, expiration, and signature
4. **Secure:** Cryptographically signed, can't be forged without JWT_SECRET

This ensures the connection flow works reliably even in serverless/edge environments.

## Migration from User Bots

If you previously had users creating their own bots:

1. Apply migration 009 to remove `telegram_bot_token` column
2. Users will see "Connect Telegram" button in Settings
3. Their old configuration will be automatically cleared
4. They need to reconnect using the new shared bot

## Environment Variables Summary

```bash
# Required for Telegram notifications
TELEGRAM_BOT_TOKEN=your_bot_token         # From @BotFather
TELEGRAM_BOT_USERNAME=your_bot_username   # Without @
NEXT_PUBLIC_APP_URL=your_app_url          # For connection links

# Optional - legacy admin notifications
TELEGRAM_CHAT_ID=your_admin_chat_id       # Sends all changes to admin
```
