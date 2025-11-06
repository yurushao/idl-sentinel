-- Migration: Switch to shared Telegram bot
-- This removes the need for users to create their own bots
-- Users will connect to a single IDL Sentinel bot

-- Remove telegram_bot_token column (no longer needed)
ALTER TABLE users
DROP COLUMN IF EXISTS telegram_bot_token;

-- Add telegram_username for better user experience
ALTER TABLE users
ADD COLUMN IF NOT EXISTS telegram_username TEXT;

-- Note: telegram_chat_id column already exists from migration 008
-- It will be populated when users connect via the bot
