-- Add Telegram configuration columns to users table
-- Allows each user to configure their own Telegram bot for personal notifications

ALTER TABLE users
ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT,
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_telegram_configured
ON users(id)
WHERE telegram_bot_token IS NOT NULL AND telegram_chat_id IS NOT NULL;

-- Add Telegram notification tracking to idl_changes
ALTER TABLE idl_changes
ADD COLUMN IF NOT EXISTS telegram_user_notified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS telegram_user_notified_at TIMESTAMPTZ;

-- Create index for unnotified Telegram changes
CREATE INDEX IF NOT EXISTS idx_idl_changes_telegram_user_notified
ON idl_changes(telegram_user_notified)
WHERE telegram_user_notified = false;

COMMENT ON COLUMN users.telegram_bot_token IS 'User-specific Telegram bot token for personal notifications';
COMMENT ON COLUMN users.telegram_chat_id IS 'User-specific Telegram chat ID for personal notifications';
COMMENT ON COLUMN idl_changes.telegram_user_notified IS 'Flag indicating if user-specific Telegram notifications have been sent';
COMMENT ON COLUMN idl_changes.telegram_user_notified_at IS 'Timestamp when user-specific Telegram notifications were sent';
