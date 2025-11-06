-- Create user_watchlist table ONLY
-- Run this if the users table already exists but user_watchlist doesn't

-- Add slack_webhook_url to users table if not exists
ALTER TABLE users
ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT;

-- Create user_watchlist table for program subscriptions
CREATE TABLE IF NOT EXISTS user_watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES monitored_programs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure a user can only watch a program once
    UNIQUE(user_id, program_id)
);

-- Index for fast user watchlist queries
CREATE INDEX IF NOT EXISTS idx_user_watchlist_user ON user_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_user_watchlist_program ON user_watchlist(program_id);

-- Enable RLS on user_watchlist table
ALTER TABLE user_watchlist ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON user_watchlist;
DROP POLICY IF EXISTS "Enable insert for own watchlist" ON user_watchlist;
DROP POLICY IF EXISTS "Enable delete for own watchlist" ON user_watchlist;

-- Users can read all watchlist entries
CREATE POLICY "Enable read access for all users" ON user_watchlist
  FOR SELECT USING (true);

-- Users can only insert their own watchlist entries
CREATE POLICY "Enable insert for own watchlist" ON user_watchlist
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE wallet_address = current_setting('app.current_wallet', true))
  );

-- Users can only delete their own watchlist entries
CREATE POLICY "Enable delete for own watchlist" ON user_watchlist
  FOR DELETE USING (
    user_id IN (SELECT id FROM users WHERE wallet_address = current_setting('app.current_wallet', true))
  );

-- Add Slack notification columns to idl_changes table if not exists
ALTER TABLE idl_changes
ADD COLUMN IF NOT EXISTS slack_notified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS slack_notified_at TIMESTAMPTZ;

-- Create index for unnotified Slack changes
CREATE INDEX IF NOT EXISTS idx_idl_changes_slack_notified
ON idl_changes(slack_notified)
WHERE slack_notified = false;

-- Verify the table was created
SELECT 'user_watchlist table created successfully!' as message;
