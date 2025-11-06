-- Add Slack notification columns to idl_changes table
ALTER TABLE idl_changes
ADD COLUMN IF NOT EXISTS slack_notified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS slack_notified_at TIMESTAMPTZ;

-- Create index for unnotified Slack changes
CREATE INDEX IF NOT EXISTS idx_idl_changes_slack_notified
ON idl_changes(slack_notified)
WHERE slack_notified = false;

COMMENT ON COLUMN idl_changes.slack_notified IS 'Flag indicating if Slack notifications have been sent for this change';
COMMENT ON COLUMN idl_changes.slack_notified_at IS 'Timestamp when Slack notifications were sent';
