-- Migration: Drop UPI ID column from withdrawal_requests
-- Now that we use wallet_address and wallet_type, we can safely drop upi_id

-- Make upi_id nullable first (in case there are references)
ALTER TABLE withdrawal_requests 
ALTER COLUMN upi_id DROP NOT NULL;

-- Drop the upi_id column
ALTER TABLE withdrawal_requests 
DROP COLUMN IF EXISTS upi_id;

-- Add comment
COMMENT ON COLUMN withdrawal_requests.wallet_address IS 'USDT wallet address (BEP20/Polygon) or Binance ID for withdrawals';
COMMENT ON COLUMN withdrawal_requests.wallet_type IS 'Payment method: usdt_bep20, usdt_polygon, or binance_id';

-- Migration complete
