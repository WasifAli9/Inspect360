-- Migration: Change subscription_tiers.code from enum to varchar
-- This allows admins to create tiers with any code value, not just predefined enum values
-- Note: The plan_code enum is still used in other tables (plans, bundle_tier_pricing)

BEGIN;

-- Step 1: Change the code column from enum to varchar
ALTER TABLE subscription_tiers 
ALTER COLUMN code TYPE VARCHAR(100) USING code::VARCHAR;

-- Step 2: Add a check constraint to ensure code is lowercase and alphanumeric with underscores
ALTER TABLE subscription_tiers
ADD CONSTRAINT subscription_tiers_code_format 
CHECK (code ~ '^[a-z0-9_]+$');

-- Step 3: Ensure the unique constraint is still in place (it should be, but verify)
-- The unique constraint on code should remain from the original schema

COMMIT;

