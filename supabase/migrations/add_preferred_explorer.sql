-- Migration: Add preferred_explorer column to users table
-- Date: 2025-12-29
-- Description: Adds a preferred_explorer column to allow users to select their preferred Solana explorer

-- Add the column with default value
ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferred_explorer TEXT DEFAULT 'explorer.solana.com';

-- Add check constraint
ALTER TABLE users
ADD CONSTRAINT check_preferred_explorer
CHECK (preferred_explorer IN ('explorer.solana.com', 'solscan.io'));

-- Add comment
COMMENT ON COLUMN users.preferred_explorer IS 'Preferred Solana explorer (explorer.solana.com or solscan.io)';
