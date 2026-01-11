-- Migration: Remove legacy creditsRemaining field and migrate to credit batch system
-- This migration:
-- 1. Migrates existing creditsRemaining values to credit_batches
-- 2. Removes the credits_remaining column from organizations table

BEGIN;

-- Step 1: Migrate existing creditsRemaining values to credit_batches
-- Only migrate organizations that have creditsRemaining > 0 and no existing credit batches
INSERT INTO credit_batches (
  id,
  organization_id,
  granted_quantity,
  remaining_quantity,
  grant_source,
  granted_at,
  expires_at,
  unit_cost_minor_units,
  rolled,
  metadata_json,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  o.id,
  o.credits_remaining,
  o.credits_remaining,
  'admin_grant'::credit_source,
  COALESCE(o.created_at, NOW()),
  NULL, -- No expiration for migrated credits
  NULL, -- No unit cost for migrated credits
  false,
  jsonb_build_object(
    'adminNotes', 'Migrated from legacy creditsRemaining field',
    'migrationDate', NOW()
  ),
  NOW(),
  NOW()
FROM organizations o
WHERE o.credits_remaining > 0
  AND NOT EXISTS (
    SELECT 1 
    FROM credit_batches cb 
    WHERE cb.organization_id = o.id
  );

-- Step 2: Log the migration in credit_ledger for audit trail
INSERT INTO credit_ledger (
  id,
  organization_id,
  created_by,
  source,
  quantity,
  batch_id,
  unit_cost_minor_units,
  notes,
  linked_entity_type,
  linked_entity_id,
  created_at
)
SELECT
  gen_random_uuid(),
  o.id,
  NULL, -- Migration doesn't have a specific user
  'admin_grant'::credit_source,
  o.credits_remaining,
  cb.id,
  NULL,
  'Migrated from legacy creditsRemaining field during system migration',
  'migration',
  NULL,
  NOW()
FROM organizations o
INNER JOIN credit_batches cb ON cb.organization_id = o.id
WHERE o.credits_remaining > 0
  AND cb.metadata_json->>'adminNotes' = 'Migrated from legacy creditsRemaining field'
  AND cb.metadata_json->>'migrationDate' IS NOT NULL;

-- Step 3: Drop the credits_remaining column
ALTER TABLE organizations DROP COLUMN IF EXISTS credits_remaining;

COMMIT;

-- Verification query (run after migration to verify):
-- SELECT 
--   o.id,
--   o.name,
--   COALESCE(SUM(cb.remaining_quantity), 0) as total_credits_in_batches
-- FROM organizations o
-- LEFT JOIN credit_batches cb ON cb.organization_id = o.id
-- GROUP BY o.id, o.name
-- ORDER BY total_credits_in_batches DESC;

