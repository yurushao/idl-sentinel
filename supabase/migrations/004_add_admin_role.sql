-- Add is_admin column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for admin lookups
CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin) WHERE is_admin = true;

-- Set the admin wallet address
INSERT INTO users (wallet_address, is_admin, created_at, last_login_at)
VALUES ('yuru1ARL4bcmSFpufUCdCrF4joamZRui9CawdgE4ZCW', true, NOW(), NOW())
ON CONFLICT (wallet_address)
DO UPDATE SET is_admin = true;

-- Update RLS policies to allow admin access to all programs
DROP POLICY IF EXISTS "Enable update for owners" ON monitored_programs;
DROP POLICY IF EXISTS "Enable delete for owners" ON monitored_programs;

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

COMMENT ON COLUMN users.is_admin IS 'Flag indicating if user has admin privileges';
