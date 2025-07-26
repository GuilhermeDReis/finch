-- Update user_charts table to allow 3 months period
-- This fixes the period_months constraint to include 3, 6, 12, and 24 months

-- Drop the existing check constraint
ALTER TABLE user_charts DROP CONSTRAINT IF EXISTS user_charts_period_months_check;

-- Add the new check constraint that includes 3 months
ALTER TABLE user_charts ADD CONSTRAINT user_charts_period_months_check 
CHECK (period_months IN (3, 6, 12, 24));

-- Update comment to reflect the change
COMMENT ON COLUMN user_charts.period_months IS 'Analysis period in months (3, 6, 12, or 24)';
