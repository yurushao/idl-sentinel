-- Add a new admin user
-- Replace 'YOUR_WALLET_ADDRESS_HERE' with the actual wallet address

INSERT INTO users (wallet_address, is_admin, created_at, last_login_at)
VALUES ('YOUR_WALLET_ADDRESS_HERE', true, NOW(), NOW())
ON CONFLICT (wallet_address)
DO UPDATE SET is_admin = true;

-- Example:
-- INSERT INTO users (wallet_address, is_admin, created_at, last_login_at)
-- VALUES ('ABC123XYZ...', true, NOW(), NOW())
-- ON CONFLICT (wallet_address)
-- DO UPDATE SET is_admin = true;
