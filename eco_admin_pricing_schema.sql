-- ============================================================================
-- Eco-Admin Pricing Configuration Schema
-- ============================================================================
-- This file contains all SQL CREATE TABLE statements for the Eco-Admin
-- pricing configuration system (2026 pricing model)
-- ============================================================================

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

-- Create enum types (PostgreSQL 9.5+ supports IF NOT EXISTS)
-- For older versions, remove "IF NOT EXISTS" and run only if types don't exist
DO $$ BEGIN
  CREATE TYPE plan_code AS ENUM (
    'starter', 
    'growth', 
    'professional', 
    'enterprise', 
    'enterprise_plus', 
    'freelancer', 
    'btr', 
    'pbsa', 
    'housing_association', 
    'council'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE billing_interval AS ENUM ('monthly', 'annual');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE limit_type AS ENUM ('active_tenants', 'work_orders', 'disputes');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE override_type AS ENUM ('subscription', 'module', 'addon');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 1.1 CURRENCY MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS currency_config (
  code VARCHAR(3) PRIMARY KEY, -- ISO 4217: GBP, USD, EUR, etc.
  symbol VARCHAR(5) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  default_for_region VARCHAR(50),
  conversion_rate NUMERIC(10, 4) DEFAULT '1.0000',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 1.2 SUBSCRIPTION TIER CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_tiers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code plan_code NOT NULL UNIQUE,
  description TEXT,
  tier_order INTEGER NOT NULL,
  included_inspections INTEGER NOT NULL,
  base_price_monthly INTEGER NOT NULL, -- Master currency (GBP) in pence
  base_price_annual INTEGER NOT NULL, -- Master currency (GBP) in pence
  annual_discount_percentage NUMERIC(5, 2) DEFAULT '16.70',
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_custom_pricing BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_tiers_tier_order ON subscription_tiers(tier_order);
CREATE INDEX IF NOT EXISTS idx_subscription_tiers_is_active ON subscription_tiers(is_active);

-- Multi-currency pricing for tiers
CREATE TABLE IF NOT EXISTS tier_pricing (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id VARCHAR NOT NULL REFERENCES subscription_tiers(id) ON DELETE CASCADE,
  currency_code VARCHAR(3) NOT NULL REFERENCES currency_config(code) ON DELETE RESTRICT,
  price_monthly INTEGER NOT NULL,
  price_annual INTEGER NOT NULL,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(tier_id, currency_code)
);

CREATE INDEX IF NOT EXISTS idx_tier_pricing_tier_id ON tier_pricing(tier_id);
CREATE INDEX IF NOT EXISTS idx_tier_pricing_currency_code ON tier_pricing(currency_code);

-- ============================================================================
-- 1.3 ADD-ON INSPECTION PACK CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS addon_pack_config (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  inspection_quantity INTEGER NOT NULL,
  pack_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addon_pack_config_pack_order ON addon_pack_config(pack_order);
CREATE INDEX IF NOT EXISTS idx_addon_pack_config_is_active ON addon_pack_config(is_active);

-- Tier-based pricing for add-on packs
CREATE TABLE IF NOT EXISTS addon_pack_pricing (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id VARCHAR NOT NULL REFERENCES addon_pack_config(id) ON DELETE CASCADE,
  tier_id VARCHAR NOT NULL REFERENCES subscription_tiers(id) ON DELETE CASCADE,
  currency_code VARCHAR(3) NOT NULL REFERENCES currency_config(code) ON DELETE RESTRICT,
  price_per_inspection INTEGER NOT NULL,
  total_pack_price INTEGER NOT NULL,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(pack_id, tier_id, currency_code)
);

CREATE INDEX IF NOT EXISTS idx_addon_pack_pricing_pack_id ON addon_pack_pricing(pack_id);
CREATE INDEX IF NOT EXISTS idx_addon_pack_pricing_tier_id ON addon_pack_pricing(tier_id);

-- ============================================================================
-- 1.4 EXTENSIVE INSPECTION CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS extensive_inspection_config (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  image_count INTEGER DEFAULT 800,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_extensive_inspection_config_is_active ON extensive_inspection_config(is_active);

-- Tier-based pricing for extensive inspections
CREATE TABLE IF NOT EXISTS extensive_inspection_pricing (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  extensive_type_id VARCHAR NOT NULL REFERENCES extensive_inspection_config(id) ON DELETE CASCADE,
  tier_id VARCHAR NOT NULL REFERENCES subscription_tiers(id) ON DELETE CASCADE,
  currency_code VARCHAR(3) NOT NULL REFERENCES currency_config(code) ON DELETE RESTRICT,
  price_per_inspection INTEGER NOT NULL,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(extensive_type_id, tier_id, currency_code)
);

CREATE INDEX IF NOT EXISTS idx_extensive_inspection_pricing_type_id ON extensive_inspection_pricing(extensive_type_id);
CREATE INDEX IF NOT EXISTS idx_extensive_inspection_pricing_tier_id ON extensive_inspection_pricing(tier_id);

-- ============================================================================
-- 1.5 MODULE CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_modules (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  module_key VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  icon_name VARCHAR(50),
  is_available_globally BOOLEAN NOT NULL DEFAULT true,
  default_enabled BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_modules_module_key ON marketplace_modules(module_key);
CREATE INDEX IF NOT EXISTS idx_marketplace_modules_is_available_globally ON marketplace_modules(is_available_globally);
CREATE INDEX IF NOT EXISTS idx_marketplace_modules_display_order ON marketplace_modules(display_order);

-- Multi-currency pricing for modules
CREATE TABLE IF NOT EXISTS module_pricing (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id VARCHAR NOT NULL REFERENCES marketplace_modules(id) ON DELETE CASCADE,
  currency_code VARCHAR(3) NOT NULL REFERENCES currency_config(code) ON DELETE RESTRICT,
  price_monthly INTEGER NOT NULL,
  price_annual INTEGER NOT NULL,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(module_id, currency_code)
);

CREATE INDEX IF NOT EXISTS idx_module_pricing_module_id ON module_pricing(module_id);
CREATE INDEX IF NOT EXISTS idx_module_pricing_currency_code ON module_pricing(currency_code);

-- Usage limits and overage pricing for modules
CREATE TABLE IF NOT EXISTS module_limits (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id VARCHAR NOT NULL REFERENCES marketplace_modules(id) ON DELETE CASCADE,
  limit_type limit_type NOT NULL,
  included_quantity INTEGER NOT NULL,
  overage_price INTEGER NOT NULL,
  overage_currency VARCHAR(3) NOT NULL REFERENCES currency_config(code) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_module_limits_module_id ON module_limits(module_id);

-- ============================================================================
-- 1.6 MODULE BUNDLE CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS module_bundles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  discount_percentage NUMERIC(5, 2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_module_bundles_is_active ON module_bundles(is_active);

-- Junction table for bundle modules
CREATE TABLE IF NOT EXISTS bundle_modules_junction (
  bundle_id VARCHAR NOT NULL REFERENCES module_bundles(id) ON DELETE CASCADE,
  module_id VARCHAR NOT NULL REFERENCES marketplace_modules(id) ON DELETE CASCADE,
  PRIMARY KEY (bundle_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_bundle_modules_junction_bundle_id ON bundle_modules_junction(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_modules_junction_module_id ON bundle_modules_junction(module_id);

-- Multi-currency pricing for bundles
CREATE TABLE IF NOT EXISTS bundle_pricing (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id VARCHAR NOT NULL REFERENCES module_bundles(id) ON DELETE CASCADE,
  currency_code VARCHAR(3) NOT NULL REFERENCES currency_config(code) ON DELETE RESTRICT,
  price_monthly INTEGER NOT NULL,
  price_annual INTEGER NOT NULL,
  savings_monthly INTEGER,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(bundle_id, currency_code)
);

CREATE INDEX IF NOT EXISTS idx_bundle_pricing_bundle_id ON bundle_pricing(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_pricing_currency_code ON bundle_pricing(currency_code);

-- ============================================================================
-- 2.1 INSTANCE CONFIGURATION
-- ============================================================================
-- Note: This table references organizations and admin_users tables which
-- should already exist in your schema. If not, create them first.

CREATE TABLE IF NOT EXISTS instance_subscriptions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL UNIQUE, -- REFERENCES organizations(id) ON DELETE CASCADE,
  registration_currency VARCHAR(3) NOT NULL REFERENCES currency_config(code) ON DELETE RESTRICT,
  current_tier_id VARCHAR REFERENCES subscription_tiers(id) ON DELETE SET NULL,
  inspection_quota_included INTEGER NOT NULL,
  billing_cycle billing_interval NOT NULL DEFAULT 'monthly',
  subscription_start_date TIMESTAMP DEFAULT NOW(),
  subscription_renewal_date TIMESTAMP,
  subscription_status VARCHAR(20) DEFAULT 'active',
  -- Pricing overrides
  override_monthly_fee INTEGER,
  override_annual_fee INTEGER,
  override_reason TEXT,
  override_set_by VARCHAR, -- REFERENCES admin_users(id) ON DELETE SET NULL,
  override_date TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_instance_subscriptions_organization_id ON instance_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_instance_subscriptions_current_tier_id ON instance_subscriptions(current_tier_id);

-- ============================================================================
-- 2.2 INSTANCE MODULES
-- ============================================================================

CREATE TABLE IF NOT EXISTS instance_modules (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id VARCHAR NOT NULL REFERENCES instance_subscriptions(id) ON DELETE CASCADE,
  module_id VARCHAR NOT NULL REFERENCES marketplace_modules(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  enabled_date TIMESTAMP,
  disabled_date TIMESTAMP,
  billing_start_date TIMESTAMP,
  monthly_price INTEGER,
  annual_price INTEGER,
  currency_code VARCHAR(3) REFERENCES currency_config(code) ON DELETE SET NULL,
  usage_limit INTEGER,
  current_usage INTEGER DEFAULT 0,
  overage_charges INTEGER DEFAULT 0,
  UNIQUE(instance_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_instance_modules_instance_id ON instance_modules(instance_id);
CREATE INDEX IF NOT EXISTS idx_instance_modules_module_id ON instance_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_instance_modules_is_enabled ON instance_modules(is_enabled);

-- ============================================================================
-- 2.3 INSTANCE BUNDLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS instance_bundles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id VARCHAR NOT NULL REFERENCES instance_subscriptions(id) ON DELETE CASCADE,
  bundle_id VARCHAR NOT NULL REFERENCES module_bundles(id) ON DELETE CASCADE,
  purchase_date TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP DEFAULT NOW(),
  end_date TIMESTAMP,
  bundle_price_monthly INTEGER,
  bundle_price_annual INTEGER,
  currency_code VARCHAR(3) REFERENCES currency_config(code) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_instance_bundles_instance_id ON instance_bundles(instance_id);
CREATE INDEX IF NOT EXISTS idx_instance_bundles_bundle_id ON instance_bundles(bundle_id);

-- ============================================================================
-- 2.4 ADD-ON PURCHASES
-- ============================================================================

CREATE TABLE IF NOT EXISTS instance_addon_purchases (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id VARCHAR NOT NULL REFERENCES instance_subscriptions(id) ON DELETE CASCADE,
  pack_id VARCHAR NOT NULL REFERENCES addon_pack_config(id) ON DELETE RESTRICT,
  tier_id_at_purchase VARCHAR NOT NULL REFERENCES subscription_tiers(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  price_per_inspection INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  currency_code VARCHAR(3) NOT NULL REFERENCES currency_config(code) ON DELETE RESTRICT,
  purchase_date TIMESTAMP DEFAULT NOW(),
  expiry_date TIMESTAMP,
  inspections_used INTEGER DEFAULT 0,
  inspections_remaining INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'active' -- active, depleted, expired
);

CREATE INDEX IF NOT EXISTS idx_instance_addon_purchases_instance_id ON instance_addon_purchases(instance_id);
CREATE INDEX IF NOT EXISTS idx_instance_addon_purchases_status ON instance_addon_purchases(status);
CREATE INDEX IF NOT EXISTS idx_instance_addon_purchases_expiry_date ON instance_addon_purchases(expiry_date);

-- ============================================================================
-- 2.5 INSTANCE-LEVEL PRICING OVERRIDES
-- ============================================================================

CREATE TABLE IF NOT EXISTS instance_module_overrides (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id VARCHAR NOT NULL REFERENCES instance_subscriptions(id) ON DELETE CASCADE,
  module_id VARCHAR NOT NULL REFERENCES marketplace_modules(id) ON DELETE CASCADE,
  override_monthly_price INTEGER,
  override_annual_price INTEGER,
  reason TEXT,
  set_by VARCHAR, -- REFERENCES admin_users(id) ON DELETE SET NULL,
  date TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(instance_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_instance_module_overrides_instance_id ON instance_module_overrides(instance_id);
CREATE INDEX IF NOT EXISTS idx_instance_module_overrides_module_id ON instance_module_overrides(module_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_instance_module_overrides_unique ON instance_module_overrides(instance_id, module_id);

-- Pricing override history/audit trail
CREATE TABLE IF NOT EXISTS pricing_override_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id VARCHAR NOT NULL REFERENCES instance_subscriptions(id) ON DELETE CASCADE,
  override_type override_type NOT NULL,
  target_id VARCHAR NOT NULL, -- tier_id or module_id
  old_price_monthly INTEGER,
  new_price_monthly INTEGER,
  old_price_annual INTEGER,
  new_price_annual INTEGER,
  reason TEXT,
  changed_by VARCHAR, -- REFERENCES admin_users(id) ON DELETE SET NULL,
  change_date TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_override_history_instance_id ON pricing_override_history(instance_id);
CREATE INDEX IF NOT EXISTS idx_pricing_override_history_change_date ON pricing_override_history(change_date);

-- ============================================================================
-- 3.1 INVOICE STORAGE
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL, -- REFERENCES organizations(id) ON DELETE CASCADE,
  instance_subscription_id VARCHAR NOT NULL REFERENCES instance_subscriptions(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  billing_cycle billing_interval NOT NULL,
  currency_code VARCHAR(3) NOT NULL REFERENCES currency_config(code) ON DELETE RESTRICT,
  -- Line items stored as JSON for flexibility
  line_items JSONB NOT NULL, -- { subscription: {...}, modules: [...], addons: [...], overages: [...] }
  subtotal INTEGER NOT NULL, -- In minor units
  discount INTEGER DEFAULT 0,
  total INTEGER NOT NULL, -- In minor units
  status VARCHAR(20) DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
  stripe_invoice_id VARCHAR, -- If synced with Stripe
  pdf_url VARCHAR, -- URL to generated PDF invoice
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  due_date TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_instance_subscription_id ON invoices(instance_subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- ============================================================================
-- 3.2 CREDIT NOTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS credit_notes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL, -- REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id VARCHAR REFERENCES invoices(id) ON DELETE SET NULL,
  credit_note_number VARCHAR(50) NOT NULL UNIQUE,
  reason VARCHAR(50) NOT NULL, -- downgrade, refund, adjustment, etc.
  amount INTEGER NOT NULL, -- In minor units
  currency_code VARCHAR(3) NOT NULL REFERENCES currency_config(code) ON DELETE RESTRICT,
  description TEXT,
  status VARCHAR(20) DEFAULT 'issued', -- issued, applied, cancelled
  applied_to_invoice_id VARCHAR REFERENCES invoices(id) ON DELETE SET NULL,
  created_by VARCHAR, -- REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  applied_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_notes_organization_id ON credit_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_status ON credit_notes(status);

-- ============================================================================
-- 3.3 EXTENSIVE INSPECTION TRACKING
-- ============================================================================

-- Add extensive_inspection_type_id to inspections table (via ALTER TABLE)
-- This tracks which extensive inspection type was used (if any)
-- Note: This column needs to be added via migration, not in this schema file

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- 1. Foreign Key References:
--    - instance_subscriptions.organization_id should reference organizations(id)
--    - instance_subscriptions.override_set_by should reference admin_users(id)
--    - instance_module_overrides.set_by should reference admin_users(id)
--    - pricing_override_history.changed_by should reference admin_users(id)
--
--    These foreign keys are commented out because the referenced tables may
--    not exist yet or may have different names. Uncomment and adjust as needed.
--
-- 2. All prices are stored in minor units (pence, cents, fils, etc.):
--    - Monthly prices: stored as integer in minor units
--    - Annual prices: stored as integer in minor units
--    - Example: £199.00 = 19900 (pence)
--
-- 3. Conversion rates are stored relative to the master currency (GBP):
--    - GBP conversion_rate = 1.0000
--    - USD conversion_rate = 1.27 (example)
--
-- 4. The schema supports:
--    - Multi-currency pricing for all products
--    - Tier-based pricing for add-on packs and extensive inspections
--    - Usage limits with overage pricing for modules
--    - Instance-level pricing overrides
--    - Complete audit trail for pricing changes
-- ============================================================================

