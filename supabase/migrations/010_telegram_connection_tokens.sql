-- Create table for Telegram connection tokens
-- This allows stateless token validation across serverless instances

CREATE TABLE IF NOT EXISTS telegram_connection_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_telegram_tokens_token ON telegram_connection_tokens(token) WHERE used = FALSE;

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_telegram_tokens_expires ON telegram_connection_tokens(expires_at) WHERE used = FALSE;

-- Enable RLS
ALTER TABLE telegram_connection_tokens ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access (API routes only)
CREATE POLICY "Service role full access" ON telegram_connection_tokens
  FOR ALL
  USING (auth.role() = 'service_role');
