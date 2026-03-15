-- Migration: Update Tier Names to Gold/Silver and Wallet Fields to USDT
-- Update tier values from tier1/tier2 to gold/silver
-- Update withdrawal_requests to use wallet_address and wallet_type instead of upi_id

-- Step 1: Drop existing tier constraint if it exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tier_check;

-- Step 2: Update tier values
UPDATE users SET tier = 'gold' WHERE tier = 'tier1';
UPDATE users SET tier = 'silver' WHERE tier = 'tier2';

-- Step 3: Add new constraint for gold/silver
ALTER TABLE users ADD CONSTRAINT users_tier_check CHECK (tier IN ('gold', 'silver'));

-- Step 4: Update comment on tier column
COMMENT ON COLUMN users.tier IS 'Gold: 1k+ karma, 1+ year (comment + post tasks). Silver: 200+ karma, 3+ months (comment tasks only). Admin-assigned based on Reddit profile verification.';

-- Step 5: Update withdrawal_requests table
-- Add new columns
ALTER TABLE withdrawal_requests 
ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(200),
ADD COLUMN IF NOT EXISTS wallet_type VARCHAR(20);

-- Step 6: Migrate existing upi_id data to wallet_address
UPDATE withdrawal_requests 
SET wallet_address = upi_id, 
    wallet_type = 'upi' 
WHERE wallet_address IS NULL AND upi_id IS NOT NULL;

-- Step 7: Make wallet_address NOT NULL (after migration)
ALTER TABLE withdrawal_requests 
ALTER COLUMN wallet_address SET NOT NULL;

-- Step 8: Add constraint for wallet_type
ALTER TABLE withdrawal_requests 
DROP CONSTRAINT IF EXISTS withdrawal_requests_wallet_type_check;

ALTER TABLE withdrawal_requests 
ADD CONSTRAINT withdrawal_requests_wallet_type_check 
CHECK (wallet_type IN ('usdt_bep20', 'usdt_polygon', 'binance_id', 'upi'));

-- Step 9: Make wallet_type NOT NULL
ALTER TABLE withdrawal_requests 
ALTER COLUMN wallet_type SET NOT NULL;

-- Optional: Drop upi_id column after migration (commented out for safety)
-- ALTER TABLE withdrawal_requests DROP COLUMN IF EXISTS upi_id;

-- Add comment
COMMENT ON COLUMN withdrawal_requests.wallet_address IS 'USDT wallet address (BEP20/Polygon) or Binance ID for withdrawals';
COMMENT ON COLUMN withdrawal_requests.wallet_type IS 'Wallet type: usdt_bep20, usdt_polygon, or binance_id';

-- Migration complete
