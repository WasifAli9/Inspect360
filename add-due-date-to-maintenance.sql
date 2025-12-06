-- Add due_date column to maintenance_requests table
ALTER TABLE maintenance_requests 
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;

