-- Add is_active column to banks table
-- This column is required by the frontend when querying banks with is_active=eq.true

ALTER TABLE banks ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing records to be active
UPDATE banks SET is_active = true WHERE is_active IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN banks.is_active IS 'Indicates if the bank is active and available for selection';
