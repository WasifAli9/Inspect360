-- Migration: Add tenant check-in approval fields to inspections and organizations tables
-- Run this script on your database to add the tenant check-in approval functionality

DO $$ 
BEGIN
    -- Add tenant approval fields to inspections table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inspections' 
        AND column_name = 'tenant_approval_status'
    ) THEN
        ALTER TABLE inspections ADD COLUMN tenant_approval_status VARCHAR;
        RAISE NOTICE 'Added tenant_approval_status column to inspections';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inspections' 
        AND column_name = 'tenant_approval_deadline'
    ) THEN
        ALTER TABLE inspections ADD COLUMN tenant_approval_deadline TIMESTAMP;
        RAISE NOTICE 'Added tenant_approval_deadline column to inspections';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inspections' 
        AND column_name = 'tenant_approved_at'
    ) THEN
        ALTER TABLE inspections ADD COLUMN tenant_approved_at TIMESTAMP;
        RAISE NOTICE 'Added tenant_approved_at column to inspections';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inspections' 
        AND column_name = 'tenant_approved_by'
    ) THEN
        ALTER TABLE inspections ADD COLUMN tenant_approved_by VARCHAR;
        RAISE NOTICE 'Added tenant_approved_by column to inspections';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inspections' 
        AND column_name = 'tenant_comments'
    ) THEN
        ALTER TABLE inspections ADD COLUMN tenant_comments TEXT;
        RAISE NOTICE 'Added tenant_comments column to inspections';
    END IF;
    
    -- Add approval period configuration to organizations table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'check_in_approval_period_days'
    ) THEN
        ALTER TABLE organizations ADD COLUMN check_in_approval_period_days INTEGER DEFAULT 5;
        RAISE NOTICE 'Added check_in_approval_period_days column to organizations';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully';
END $$;

