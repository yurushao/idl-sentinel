-- ============================================
-- MIGRATION 003: Add Authentication Users
-- ============================================

-- Users table to store wallet addresses
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast wallet lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);

-- Add owner to monitored programs
ALTER TABLE monitored_programs
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Index for owner queries
CREATE INDEX IF NOT EXISTS idx_monitored_programs_owner ON monitored_programs(owner_id);

-- Update RLS policies for monitored_programs
DROP POLICY IF EXISTS "Enable read access for all users" ON monitored_programs;
DROP POLICY IF EXISTS "Enable write access for all users" ON monitored_programs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON monitored_programs;
DROP POLICY IF EXISTS "Enable update for owners" ON monitored_programs;
DROP POLICY IF EXISTS "Enable delete for owners" ON monitored_programs;

-- Anyone can read programs
CREATE POLICY "Enable read access for all users" ON monitored_programs
  FOR SELECT USING (true);

-- Users can only insert their own programs
CREATE POLICY "Enable insert for authenticated users" ON monitored_programs
  FOR INSERT WITH CHECK (
    owner_id IN (SELECT id FROM users WHERE wallet_address = current_setting('app.current_wallet', true))
  );

-- Users can only update their own programs
CREATE POLICY "Enable update for owners" ON monitored_programs
  FOR UPDATE USING (
    owner_id IN (SELECT id FROM users WHERE wallet_address = current_setting('app.current_wallet', true))
  );

-- Users can only delete their own programs
CREATE POLICY "Enable delete for owners" ON monitored_programs
  FOR DELETE USING (
    owner_id IN (SELECT id FROM users WHERE wallet_address = current_setting('app.current_wallet', true))
  );

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Enable read access for all users" ON users FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own record" ON users
  FOR UPDATE USING (
    wallet_address = current_setting('app.current_wallet', true)
  );

-- ============================================
-- MIGRATION 004: Add Admin Role
-- ============================================

-- Add is_admin column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for admin lookups
CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin) WHERE is_admin = true;

-- Set the admin wallet address (CHANGE THIS TO YOUR WALLET)
INSERT INTO users (wallet_address, is_admin, created_at, last_login_at)
VALUES ('yuru1ARL4bcmSFpufUCdCrF4joamZRui9CawdgE4ZCW', true, NOW(), NOW())
ON CONFLICT (wallet_address)
DO UPDATE SET is_admin = true;

-- Update RLS policies to allow admin access to all programs
DROP POLICY IF EXISTS "Enable update for owners" ON monitored_programs;
DROP POLICY IF EXISTS "Enable delete for owners" ON monitored_programs;
DROP POLICY IF EXISTS "Enable update for owners and admin" ON monitored_programs;
DROP POLICY IF EXISTS "Enable delete for owners and admin" ON monitored_programs;

-- Users can update their own programs OR admin can update any
CREATE POLICY "Enable update for owners and admin" ON monitored_programs
  FOR UPDATE USING (
    owner_id IN (SELECT id FROM users WHERE wallet_address = current_setting('app.current_wallet', true))
    OR
    EXISTS (SELECT 1 FROM users WHERE wallet_address = current_setting('app.current_wallet', true) AND is_admin = true)
  );

-- Users can delete their own programs OR admin can delete any
CREATE POLICY "Enable delete for owners and admin" ON monitored_programs
  FOR DELETE USING (
    owner_id IN (SELECT id FROM users WHERE wallet_address = current_setting('app.current_wallet', true))
    OR
    EXISTS (SELECT 1 FROM users WHERE wallet_address = current_setting('app.current_wallet', true) AND is_admin = true)
  );

-- ============================================
-- MIGRATION 005: Add User Watchlist
-- ============================================

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
DROP POLICY IF EXISTS "Enable insert for admin only" ON monitored_programs;
DROP POLICY IF EXISTS "Enable update for admin only" ON monitored_programs;
DROP POLICY IF EXISTS "Enable delete for admin only" ON monitored_programs;

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

-- ============================================
-- MIGRATION 006: Add Slack Notifications
-- ============================================

-- Add Slack notification columns to idl_changes table
ALTER TABLE idl_changes
ADD COLUMN IF NOT EXISTS slack_notified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS slack_notified_at TIMESTAMPTZ;

-- Create index for unnotified Slack changes
CREATE INDEX IF NOT EXISTS idx_idl_changes_slack_notified
ON idl_changes(slack_notified)
WHERE slack_notified = false;
