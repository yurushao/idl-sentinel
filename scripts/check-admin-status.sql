-- Check all admin users
SELECT
  wallet_address,
  is_admin,
  created_at,
  last_login_at
FROM users
WHERE is_admin = true;

-- Check if a specific wallet is admin (replace with your wallet address)
-- SELECT
--   wallet_address,
--   is_admin
-- FROM users
-- WHERE wallet_address = 'YOUR_WALLET_ADDRESS_HERE';
