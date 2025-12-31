-- ============================================================================
-- Invoice and Credit Notes Schema Addition
-- ============================================================================
-- Run this after eco_admin_pricing_schema.sql
-- ============================================================================

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
-- Add extensive_inspection_type_id column to inspections table

ALTER TABLE inspections 
ADD COLUMN IF NOT EXISTS extensive_inspection_type_id VARCHAR REFERENCES extensive_inspection_config(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inspections_extensive_type_id ON inspections(extensive_inspection_type_id);

