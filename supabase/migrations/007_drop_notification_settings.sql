-- Drop notification_settings table as it's no longer needed
-- User-specific Slack webhooks are now stored in users.slack_webhook_url
-- Telegram config is now managed via environment variables

DROP TABLE IF EXISTS notification_settings CASCADE;

-- Clean up any references
COMMENT ON DATABASE postgres IS 'notification_settings table removed - replaced with user-specific webhooks';
