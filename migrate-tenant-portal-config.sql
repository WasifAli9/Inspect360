-- Migration: Add tenant portal configuration columns to organizations table
-- Run this script on your database to add the tenant portal configuration fields

DO $$ 
BEGIN
    -- Add tenant_portal_community_enabled column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'tenant_portal_community_enabled'
    ) THEN
        ALTER TABLE organizations ADD COLUMN tenant_portal_community_enabled BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added tenant_portal_community_enabled column';
    END IF;
    
    -- Add tenant_portal_comparison_enabled column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'tenant_portal_comparison_enabled'
    ) THEN
        ALTER TABLE organizations ADD COLUMN tenant_portal_comparison_enabled BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added tenant_portal_comparison_enabled column';
    END IF;
    
    -- Add tenant_portal_chatbot_enabled column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'tenant_portal_chatbot_enabled'
    ) THEN
        ALTER TABLE organizations ADD COLUMN tenant_portal_chatbot_enabled BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added tenant_portal_chatbot_enabled column';
    END IF;
    
    -- Add tenant_portal_maintenance_enabled column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'tenant_portal_maintenance_enabled'
    ) THEN
        ALTER TABLE organizations ADD COLUMN tenant_portal_maintenance_enabled BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added tenant_portal_maintenance_enabled column';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully';
END $$;

