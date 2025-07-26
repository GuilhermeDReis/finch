-- SQL script to fix the period_months constraint in user_charts table
-- Run this in the Supabase SQL editor

-- Drop the existing check constraint
ALTER TABLE user_charts DROP CONSTRAINT IF EXISTS user_charts_period_months_check;

-- Add the new check constraint that includes 3 months
ALTER TABLE user_charts ADD CONSTRAINT user_charts_period_months_check 
CHECK (period_months IN (3, 6, 12, 24));

-- Verify the constraint was applied correctly
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'user_charts'::regclass 
AND conname = 'user_charts_period_months_check';
