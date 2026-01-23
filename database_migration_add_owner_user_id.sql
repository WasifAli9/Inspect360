-- ============================================================================
-- PostgreSQL Migration: Add owner_user_id to inspections table
-- ============================================================================
-- This migration adds the owner_user_id column to the inspections table
-- for user-scoped offline data management in the mobile app.
-- 
-- Run this script in PgAdmin or your PostgreSQL client.
-- ============================================================================

-- Step 1: Add the owner_user_id column if it doesn't exist
-- PostgreSQL doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN,
-- so we check first and add only if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'inspections' 
        AND column_name = 'owner_user_id'
    ) THEN
        ALTER TABLE inspections 
        ADD COLUMN owner_user_id varchar;
        
        RAISE NOTICE 'Column owner_user_id added to inspections table';
    ELSE
        RAISE NOTICE 'Column owner_user_id already exists in inspections table';
    END IF;
END $$;

-- Step 2: Backfill owner_user_id from inspector_id for existing rows
-- This ensures existing inspections have an owner_user_id set
UPDATE inspections
SET owner_user_id = inspector_id
WHERE owner_user_id IS NULL 
  AND inspector_id IS NOT NULL;

-- Step 3: Create index on owner_user_id for performance (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_inspections_owner_user_id 
ON inspections(owner_user_id);

-- Step 4: Optional - Add a comment to document the column
COMMENT ON COLUMN inspections.owner_user_id IS 
'User ID of the owner of this inspection data. Used for offline data scoping in mobile app. Initially populated from inspector_id.';

-- ============================================================================
-- Verification Query (optional - run this to verify the migration)
-- ============================================================================
-- SELECT 
--     column_name, 
--     data_type, 
--     is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'inspections' 
--   AND column_name = 'owner_user_id';
--
-- SELECT 
--     indexname, 
--     indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'inspections' 
--   AND indexname = 'idx_inspections_owner_user_id';
-- ============================================================================

