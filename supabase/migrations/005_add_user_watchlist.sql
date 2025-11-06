-- Add slack_webhook_url to users table
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

-- Update monitored_programs policies: remove user creation, only admin can create/update/delete
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON monitored_programs;
DROP POLICY IF EXISTS "Enable update for owners and admin" ON monitored_programs;
DROP POLICY IF EXISTS "Enable delete for owners and admin" ON monitored_programs;

-- Only admins can insert programs
CREATE POLICY "Enable insert for admin only" ON monitored_programs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE wallet_address = current_setting('app.current_wallet', true) AND is_admin = true)
  );

-- Only admins can update programs
CREATE POLICY "Enable update for admin only" ON monitored_programs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE wallet_address = current_setting('app.current_wallet', true) AND is_admin = true)
  );

-- Only admins can delete programs
CREATE POLICY "Enable delete for admin only" ON monitored_programs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE wallet_address = current_setting('app.current_wallet', true) AND is_admin = true)
  );

COMMENT ON TABLE user_watchlist IS 'Stores which programs each user is watching/subscribed to';
COMMENT ON COLUMN users.slack_webhook_url IS 'User-specific Slack webhook URL for change notifications';
