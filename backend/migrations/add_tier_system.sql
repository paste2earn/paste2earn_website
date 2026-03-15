-- Migration: Add Tier System
-- Add tier column to users table

-- Add new column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS tier VARCHAR(10) DEFAULT 'silver' CHECK (tier IN ('gold', 'silver'));

-- Add comment for clarity
COMMENT ON COLUMN users.tier IS 'Gold: 1k+ karma, 1+ year (comment + post tasks). Silver: 200+ karma, 3+ months (comment tasks only). Admin-assigned based on Reddit profile verification.';

-- Update existing approved users to gold (for backward compatibility)
UPDATE users SET tier = 'gold' WHERE status = 'approved' AND role = 'user' AND tier IS NULL;
