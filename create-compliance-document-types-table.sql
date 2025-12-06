-- Create Compliance Document Types table for custom document types
CREATE TABLE IF NOT EXISTS compliance_document_types (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    organization_id VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS compliance_document_types_organization_id_idx ON compliance_document_types(organization_id);
CREATE INDEX IF NOT EXISTS compliance_document_types_active_idx ON compliance_document_types(organization_id, is_active);

