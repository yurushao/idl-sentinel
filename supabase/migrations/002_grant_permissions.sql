-- Grant permissions to anon and authenticated roles for all tables

-- Grant permissions for monitored_programs
GRANT ALL PRIVILEGES ON monitored_programs TO anon;
GRANT ALL PRIVILEGES ON monitored_programs TO authenticated;

-- Grant permissions for idl_snapshots
GRANT ALL PRIVILEGES ON idl_snapshots TO anon;
GRANT ALL PRIVILEGES ON idl_snapshots TO authenticated;

-- Grant permissions for idl_changes
GRANT ALL PRIVILEGES ON idl_changes TO anon;
GRANT ALL PRIVILEGES ON idl_changes TO authenticated;

-- Grant permissions for notification_settings
GRANT ALL PRIVILEGES ON notification_settings TO anon;
GRANT ALL PRIVILEGES ON notification_settings TO authenticated;

-- Grant permissions for monitoring_logs
GRANT ALL PRIVILEGES ON monitoring_logs TO anon;
GRANT ALL PRIVILEGES ON monitoring_logs TO authenticated;