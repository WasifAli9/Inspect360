-- Update Subscription Tier Ranges to Match New System
-- Tier Ranges:
-- 0-9: No tier (pay per inspection only) - but Starter tier is used as base
-- 10-29: Starter (includes 10)
-- 30-74: Growth (includes 30)
-- 75-199: Professional (includes 75)
-- 200-500: Enterprise (includes 200)
-- 500+: Enterprise Plus (custom pricing, includes 500)

-- First, verify current tier data
SELECT 
    code,
    name,
    tier_order,
    included_inspections,
    base_price_monthly,
    base_price_annual,
    is_active
FROM subscription_tiers
WHERE is_active = true
ORDER BY tier_order;

-- UPDATE statements to fix the tier ranges:
UPDATE subscription_tiers 
SET included_inspections = 10 
WHERE code = 'starter' AND included_inspections != 10;

UPDATE subscription_tiers 
SET included_inspections = 30 
WHERE code = 'growth' AND included_inspections != 30;

UPDATE subscription_tiers 
SET included_inspections = 75 
WHERE code = 'professional' AND included_inspections != 75;

UPDATE subscription_tiers 
SET included_inspections = 200 
WHERE code = 'enterprise' AND included_inspections != 200;

UPDATE subscription_tiers 
SET included_inspections = 500 
WHERE code = 'enterprise_plus' AND included_inspections != 500;

-- Verify the updates
SELECT 
    code,
    name,
    tier_order,
    included_inspections,
    base_price_monthly,
    base_price_annual,
    is_active
FROM subscription_tiers
WHERE is_active = true
ORDER BY tier_order;

-- Expected final values:
-- Starter: included_inspections = 10
-- Growth: included_inspections = 30
-- Professional: included_inspections = 75
-- Enterprise: included_inspections = 200
-- Enterprise Plus: included_inspections = 500

-- ============================================================================
-- REMOVE/DEACTIVATE ENTERPRISE PLUS TIER
-- ============================================================================

-- Option 1: Deactivate Enterprise Plus (RECOMMENDED - maintains referential integrity)
-- This will hide it from queries that filter by is_active = true
UPDATE subscription_tiers 
SET is_active = false 
WHERE code = 'enterprise_plus';

-- Option 2: Delete Enterprise Plus (USE WITH CAUTION - may break foreign key references)
-- Only use this if you're sure no other tables reference this tier
-- DELETE FROM subscription_tiers WHERE code = 'enterprise_plus';

-- Verify Enterprise Plus is deactivated/deleted
SELECT 
    code,
    name,
    tier_order,
    included_inspections,
    is_active
FROM subscription_tiers
WHERE code = 'enterprise_plus';

-- Verify only active tiers remain
SELECT 
    code,
    name,
    tier_order,
    included_inspections,
    base_price_monthly,
    base_price_annual,
    is_active
FROM subscription_tiers
WHERE is_active = true
ORDER BY tier_order;

