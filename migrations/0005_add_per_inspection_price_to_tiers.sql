-- Migration: Add per_inspection_price column to subscription_tiers table
-- This migration adds the per_inspection_price field to store the base price per inspection in GBP (pence)

BEGIN;

-- Add per_inspection_price column to subscription_tiers table
ALTER TABLE subscription_tiers 
ADD COLUMN IF NOT EXISTS per_inspection_price INTEGER NOT NULL DEFAULT 0;

-- Update existing tiers to have a default per-inspection price if not set
-- This uses the per_inspection_price from tier_pricing for GBP if available
UPDATE subscription_tiers st
SET per_inspection_price = COALESCE(
  (SELECT tp.per_inspection_price 
   FROM tier_pricing tp 
   WHERE tp.tier_id = st.id 
   AND tp.currency_code = 'GBP' 
   LIMIT 1),
  550 -- Default fallback: £5.50 per inspection in pence
)
WHERE per_inspection_price = 0;

COMMIT;

