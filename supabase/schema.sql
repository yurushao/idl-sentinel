-- =====================================================
-- IDL Sentinel Database Schema
-- =====================================================
-- This script creates all necessary tables, indexes, and policies
-- Run this on a fresh Supabase project to set up the database
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- =====================================================
-- Stores authenticated users with wallet addresses
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT NOT NULL UNIQUE,
    is_admin BOOLEAN DEFAULT false,
    slack_webhook_url TEXT,
    telegram_chat_id TEXT,
    telegram_username TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_users_telegram_configured ON users(id)
    WHERE telegram_chat_id IS NOT NULL;

-- Comments
COMMENT ON TABLE users IS 'Authenticated users with wallet addresses';
COMMENT ON COLUMN users.is_admin IS 'Flag indicating if user has admin privileges';
COMMENT ON COLUMN users.slack_webhook_url IS 'User-specific Slack webhook URL for change notifications';
COMMENT ON COLUMN users.telegram_chat_id IS 'User-specific Telegram chat ID for notifications';
COMMENT ON COLUMN users.telegram_username IS 'Telegram username for better UX';

-- =====================================================
-- MONITORED PROGRAMS TABLE
-- =====================================================
-- Programs being monitored for IDL changes
CREATE TABLE IF NOT EXISTS monitored_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for monitored_programs table
CREATE INDEX IF NOT EXISTS idx_monitored_programs_active ON monitored_programs(is_active)
    WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_monitored_programs_owner ON monitored_programs(owner_id);

-- Comments
COMMENT ON TABLE monitored_programs IS 'Solana programs being monitored for IDL changes';
COMMENT ON COLUMN monitored_programs.program_id IS 'Solana program public key address';

-- =====================================================
-- IDL SNAPSHOTS TABLE
-- =====================================================
-- Historical versions of IDL for each program
CREATE TABLE IF NOT EXISTS idl_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES monitored_programs(id) ON DELETE CASCADE,
    idl_hash TEXT NOT NULL,
    idl_content JSONB NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_program_hash UNIQUE(program_id, idl_hash)
);

-- Indexes for idl_snapshots table
CREATE INDEX IF NOT EXISTS idx_idl_snapshots_program_fetched ON idl_snapshots(program_id, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_idl_snapshots_hash ON idl_snapshots(idl_hash);

-- Comments
COMMENT ON TABLE idl_snapshots IS 'Historical snapshots of program IDLs';
COMMENT ON COLUMN idl_snapshots.idl_hash IS 'SHA-256 hash of the IDL content for change detection';
COMMENT ON COLUMN idl_snapshots.idl_content IS 'Full IDL JSON content';

-- =====================================================
-- IDL CHANGES TABLE
-- =====================================================
-- Detected changes between IDL versions
CREATE TABLE IF NOT EXISTS idl_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES monitored_programs(id) ON DELETE CASCADE,
    old_snapshot_id UUID REFERENCES idl_snapshots(id) ON DELETE SET NULL,
    new_snapshot_id UUID NOT NULL REFERENCES idl_snapshots(id) ON DELETE CASCADE,
    change_type TEXT NOT NULL,
    change_summary TEXT NOT NULL,
    change_details JSONB NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    notified BOOLEAN DEFAULT false,
    notified_at TIMESTAMPTZ,
    slack_notified BOOLEAN DEFAULT false,
    slack_notified_at TIMESTAMPTZ,
    telegram_user_notified BOOLEAN DEFAULT false,
    telegram_user_notified_at TIMESTAMPTZ,
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for idl_changes table
CREATE INDEX IF NOT EXISTS idx_idl_changes_detected ON idl_changes(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_idl_changes_program ON idl_changes(program_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_idl_changes_unnotified ON idl_changes(notified)
    WHERE notified = false;
CREATE INDEX IF NOT EXISTS idx_idl_changes_slack_notified ON idl_changes(slack_notified)
    WHERE slack_notified = false;
CREATE INDEX IF NOT EXISTS idx_idl_changes_telegram_user_notified ON idl_changes(telegram_user_notified)
    WHERE telegram_user_notified = false;

-- Comments
COMMENT ON TABLE idl_changes IS 'Detected changes between IDL versions with severity classification';
COMMENT ON COLUMN idl_changes.severity IS 'Impact level: low, medium, high, or critical';
COMMENT ON COLUMN idl_changes.notified IS 'Legacy notification flag';
COMMENT ON COLUMN idl_changes.slack_notified IS 'Flag indicating if Slack notifications have been sent';
COMMENT ON COLUMN idl_changes.telegram_user_notified IS 'Flag indicating if Telegram notifications have been sent';

-- =====================================================
-- USER WATCHLIST TABLE
-- =====================================================
-- Programs that users are watching/subscribed to
CREATE TABLE IF NOT EXISTS user_watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES monitored_programs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, program_id)
);

-- Indexes for user_watchlist table
CREATE INDEX IF NOT EXISTS idx_user_watchlist_user ON user_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_user_watchlist_program ON user_watchlist(program_id);

-- Comments
COMMENT ON TABLE user_watchlist IS 'Programs that users are watching for notifications';

-- =====================================================
-- TELEGRAM CONNECTION TOKENS TABLE
-- =====================================================
-- Temporary tokens for Telegram bot authentication
CREATE TABLE IF NOT EXISTS telegram_connection_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    used_at TIMESTAMPTZ
);

-- Indexes for telegram_connection_tokens table
CREATE INDEX IF NOT EXISTS idx_telegram_tokens_token ON telegram_connection_tokens(token)
    WHERE used = false;
CREATE INDEX IF NOT EXISTS idx_telegram_tokens_expires ON telegram_connection_tokens(expires_at)
    WHERE used = false;

-- Comments
COMMENT ON TABLE telegram_connection_tokens IS 'Temporary tokens for stateless Telegram bot authentication';

-- =====================================================
-- MONITORING LOGS TABLE
-- =====================================================
-- System logs for debugging and monitoring
CREATE TABLE IF NOT EXISTS monitoring_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL,
    program_id UUID REFERENCES monitored_programs(id) ON DELETE SET NULL,
    log_level TEXT NOT NULL CHECK (log_level IN ('info', 'warning', 'error')),
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for monitoring_logs table
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_run ON monitoring_logs(run_id, created_at);

-- Comments
COMMENT ON TABLE monitoring_logs IS 'System logs for debugging and monitoring cron jobs';

-- =====================================================
-- TRIGGERS
-- =====================================================
-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to monitored_programs
CREATE TRIGGER update_monitored_programs_updated_at
    BEFORE UPDATE ON monitored_programs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitored_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE idl_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE idl_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_connection_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for all users" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;

CREATE POLICY "Enable read access for all users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own record" ON users
    FOR UPDATE USING (
        wallet_address = current_setting('app.current_wallet', true)
    );

-- =====================================================
-- MONITORED PROGRAMS TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Enable read access for all users" ON monitored_programs;
DROP POLICY IF EXISTS "Enable insert for admin only" ON monitored_programs;
DROP POLICY IF EXISTS "Enable update for admin only" ON monitored_programs;
DROP POLICY IF EXISTS "Enable delete for admin only" ON monitored_programs;

-- Anyone can read programs
CREATE POLICY "Enable read access for all users" ON monitored_programs
    FOR SELECT USING (true);

-- Only admins can insert programs
CREATE POLICY "Enable insert for admin only" ON monitored_programs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE wallet_address = current_setting('app.current_wallet', true)
            AND is_admin = true
        )
    );

-- Only admins can update programs
CREATE POLICY "Enable update for admin only" ON monitored_programs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE wallet_address = current_setting('app.current_wallet', true)
            AND is_admin = true
        )
    );

-- Only admins can delete programs
CREATE POLICY "Enable delete for admin only" ON monitored_programs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE wallet_address = current_setting('app.current_wallet', true)
            AND is_admin = true
        )
    );

-- =====================================================
-- IDL SNAPSHOTS TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Enable read access for all users" ON idl_snapshots;
DROP POLICY IF EXISTS "Enable write access for all users" ON idl_snapshots;

CREATE POLICY "Enable read access for all users" ON idl_snapshots
    FOR SELECT USING (true);

CREATE POLICY "Enable write access for all users" ON idl_snapshots
    FOR ALL USING (true);

-- =====================================================
-- IDL CHANGES TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Enable read access for all users" ON idl_changes;
DROP POLICY IF EXISTS "Enable write access for all users" ON idl_changes;

CREATE POLICY "Enable read access for all users" ON idl_changes
    FOR SELECT USING (true);

CREATE POLICY "Enable write access for all users" ON idl_changes
    FOR ALL USING (true);

-- =====================================================
-- USER WATCHLIST TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Enable read access for all users" ON user_watchlist;
DROP POLICY IF EXISTS "Enable insert for own watchlist" ON user_watchlist;
DROP POLICY IF EXISTS "Enable delete for own watchlist" ON user_watchlist;

-- Users can read all watchlist entries
CREATE POLICY "Enable read access for all users" ON user_watchlist
    FOR SELECT USING (true);

-- Users can only insert their own watchlist entries
CREATE POLICY "Enable insert for own watchlist" ON user_watchlist
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM users
            WHERE wallet_address = current_setting('app.current_wallet', true)
        )
    );

-- Users can only delete their own watchlist entries
CREATE POLICY "Enable delete for own watchlist" ON user_watchlist
    FOR DELETE USING (
        user_id IN (
            SELECT id FROM users
            WHERE wallet_address = current_setting('app.current_wallet', true)
        )
    );

-- =====================================================
-- TELEGRAM CONNECTION TOKENS TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Service role full access" ON telegram_connection_tokens;

-- Only allow service role to access (API routes only)
CREATE POLICY "Service role full access" ON telegram_connection_tokens
    FOR ALL
    USING (auth.role() = 'service_role');

-- =====================================================
-- MONITORING LOGS TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Enable read access for all users" ON monitoring_logs;
DROP POLICY IF EXISTS "Enable write access for all users" ON monitoring_logs;

CREATE POLICY "Enable read access for all users" ON monitoring_logs
    FOR SELECT USING (true);

CREATE POLICY "Enable write access for all users" ON monitoring_logs
    FOR ALL USING (true);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
-- Grant permissions to anon and authenticated roles

GRANT ALL PRIVILEGES ON users TO anon, authenticated;
GRANT ALL PRIVILEGES ON monitored_programs TO anon, authenticated;
GRANT ALL PRIVILEGES ON idl_snapshots TO anon, authenticated;
GRANT ALL PRIVILEGES ON idl_changes TO anon, authenticated;
GRANT ALL PRIVILEGES ON user_watchlist TO anon, authenticated;
GRANT ALL PRIVILEGES ON telegram_connection_tokens TO anon, authenticated;
GRANT ALL PRIVILEGES ON monitoring_logs TO anon, authenticated;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- Schema creation complete!
--
-- Next steps:
-- 1. Set your wallet address as admin:
--    UPDATE users SET is_admin = true
--    WHERE wallet_address = 'YOUR_WALLET_ADDRESS';
--
-- 2. Configure environment variables in your .env.local file
-- 3. Deploy your Next.js application
-- =====================================================
