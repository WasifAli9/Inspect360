
-- First, ensure the 'enterprise_plus' enum value exists in plan_code
DO $$ 
BEGIN
  -- Check if 'enterprise_plus' enum value exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'enterprise_plus' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'plan_code')
  ) THEN
    -- Add the enum value
    ALTER TYPE "public"."plan_code" ADD VALUE 'enterprise_plus';
    RAISE NOTICE 'Added enterprise_plus to plan_code enum';
  ELSE
    RAISE NOTICE 'enterprise_plus enum value already exists';
  END IF;
END $$;

-- Insert Enterprise Plus tier
-- Note: base_price_monthly and base_price_annual are 0 because this tier requires custom pricing
INSERT INTO subscription_tiers (
  "id", 
  "name", 
  "code", 
  "description",
  "tier_order", 
  "included_inspections", 
  "base_price_monthly", 
  "base_price_annual", 
  "annual_discount_percentage", 
  "is_active", 
  "requires_custom_pricing", 
  "created_at", 
  "updated_at"
) VALUES (
  '6c79daec-9645-4fe8-baf1-5584ec5b8a17', 
  'Enterprise Plus', 
  'enterprise_plus', 
  'Custom enterprise plan for large organizations requiring 500+ inspections per month. Pricing is customized based on specific requirements.',
  5, 
  500, 
  0, 
  0, 
  '16.70', 
  TRUE, 
  TRUE, 
  NOW(), 
  NOW()
) 
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier_order = EXCLUDED.tier_order,
  included_inspections = EXCLUDED.included_inspections,
  base_price_monthly = EXCLUDED.base_price_monthly,
  base_price_annual = EXCLUDED.base_price_annual,
  annual_discount_percentage = EXCLUDED.annual_discount_percentage,
  is_active = EXCLUDED.is_active,
  requires_custom_pricing = EXCLUDED.requires_custom_pricing,
  updated_at = NOW();

-- Insert tier pricing for GBP (prices are 0 because it requires custom pricing)
INSERT INTO tier_pricing (
  "id", 
  "tier_id", 
  "currency_code", 
  "price_monthly", 
  "price_annual", 
  "last_updated"
) VALUES (
  '4ed1a76c-a6bf-4e7f-948d-8845332da098', 
  '6c79daec-9645-4fe8-baf1-5584ec5b8a17', 
  'GBP', 
  0, 
  0, 
  NOW()
) 
ON CONFLICT (tier_id, currency_code) DO UPDATE SET
  price_monthly = EXCLUDED.price_monthly,
  price_annual = EXCLUDED.price_annual,
  last_updated = NOW();

-- Insert tier pricing for USD
INSERT INTO tier_pricing (
  "id", 
  "tier_id", 
  "currency_code", 
  "price_monthly", 
  "price_annual", 
  "last_updated"
) VALUES (
  '4f0be062-b581-4abf-8b24-bf38d6a13f72', 
  '6c79daec-9645-4fe8-baf1-5584ec5b8a17', 
  'USD', 
  0, 
  0, 
  NOW()
) 
ON CONFLICT (tier_id, currency_code) DO UPDATE SET
  price_monthly = EXCLUDED.price_monthly,
  price_annual = EXCLUDED.price_annual,
  last_updated = NOW();

-- Insert tier pricing for AED
INSERT INTO tier_pricing (
  "id", 
  "tier_id", 
  "currency_code", 
  "price_monthly", 
  "price_annual", 
  "last_updated"
) VALUES (
  '6e762247-f3c6-4098-b696-b84763e7a7ac', 
  '6c79daec-9645-4fe8-baf1-5584ec5b8a17', 
  'AED', 
  0, 
  0, 
  NOW()
) 
ON CONFLICT (tier_id, currency_code) DO UPDATE SET
  price_monthly = EXCLUDED.price_monthly,
  price_annual = EXCLUDED.price_annual,
  last_updated = NOW();

-- Verify the tier was created/updated
SELECT 
  id,
  name,
  code,
  tier_order,
  included_inspections,
  base_price_monthly,
  base_price_annual,
  is_active,
  requires_custom_pricing
FROM subscription_tiers
WHERE code = 'enterprise_plus';

-- Verify the pricing was created/updated
SELECT 
  tp.id,
  tp.currency_code,
  tp.price_monthly,
  tp.price_annual,
  st.name as tier_name
FROM tier_pricing tp
JOIN subscription_tiers st ON tp.tier_id = st.id
WHERE st.code = 'enterprise_plus'
ORDER BY tp.currency_code;

