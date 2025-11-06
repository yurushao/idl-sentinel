-- Users table to store wallet addresses
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast wallet lookups
CREATE INDEX idx_users_wallet ON users(wallet_address);

-- Add owner to monitored programs
ALTER TABLE monitored_programs
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Index for owner queries
CREATE INDEX idx_monitored_programs_owner ON monitored_programs(owner_id);

-- Update RLS policies for monitored_programs
DROP POLICY IF EXISTS "Enable read access for all users" ON monitored_programs;
DROP POLICY IF EXISTS "Enable write access for all users" ON monitored_programs;

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
