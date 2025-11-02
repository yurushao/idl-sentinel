-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Programs being monitored
CREATE TABLE monitored_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active program queries
CREATE INDEX idx_monitored_programs_active 
ON monitored_programs(is_active) 
WHERE is_active = true;

-- IDL snapshots (historical versions)
CREATE TABLE idl_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES monitored_programs(id) ON DELETE CASCADE,
    idl_hash TEXT NOT NULL,
    idl_content JSONB NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_program_hash UNIQUE(program_id, idl_hash)
);

-- Index for fetching latest snapshot
CREATE INDEX idx_idl_snapshots_program_fetched 
ON idl_snapshots(program_id, fetched_at DESC);

-- Index for hash lookup
CREATE INDEX idx_idl_snapshots_hash 
ON idl_snapshots(idl_hash);

-- Detected changes
CREATE TABLE idl_changes (
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
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for recent changes query
CREATE INDEX idx_idl_changes_detected 
ON idl_changes(detected_at DESC);

-- Index for program-specific changes
CREATE INDEX idx_idl_changes_program 
ON idl_changes(program_id, detected_at DESC);

-- Index for unnotified changes
CREATE INDEX idx_idl_changes_unnotified 
ON idl_changes(notified) 
WHERE notified = false;

-- Telegram notification settings
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO notification_settings (setting_key, setting_value, is_active) 
VALUES 
    ('telegram_bot_token', '', false),
    ('telegram_chat_id', '', false),
    ('check_interval_hours', '6', true);

-- Monitoring logs for debugging
CREATE TABLE monitoring_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL,
    program_id UUID REFERENCES monitored_programs(id) ON DELETE SET NULL,
    log_level TEXT NOT NULL CHECK (log_level IN ('info', 'warning', 'error')),
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for log queries
CREATE INDEX idx_monitoring_logs_run 
ON monitoring_logs(run_id, created_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_monitored_programs_updated_at 
    BEFORE UPDATE ON monitored_programs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at 
    BEFORE UPDATE ON notification_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE monitored_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE idl_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE idl_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a single-user app initially)
CREATE POLICY "Enable read access for all users" ON monitored_programs FOR SELECT USING (true);
CREATE POLICY "Enable write access for all users" ON monitored_programs FOR ALL USING (true);

CREATE POLICY "Enable read access for all users" ON idl_snapshots FOR SELECT USING (true);
CREATE POLICY "Enable write access for all users" ON idl_snapshots FOR ALL USING (true);

CREATE POLICY "Enable read access for all users" ON idl_changes FOR SELECT USING (true);
CREATE POLICY "Enable write access for all users" ON idl_changes FOR ALL USING (true);

CREATE POLICY "Enable read access for all users" ON notification_settings FOR SELECT USING (true);
CREATE POLICY "Enable write access for all users" ON notification_settings FOR ALL USING (true);

CREATE POLICY "Enable read access for all users" ON monitoring_logs FOR SELECT USING (true);
CREATE POLICY "Enable write access for all users" ON monitoring_logs FOR ALL USING (true);