-- Add support for chart wizard with new chart types
-- This migration extends the user_charts table to support Evolution, Distribution, and Comparison charts

-- First, add the missing columns that were referenced in the code but not in the original schema
ALTER TABLE public.user_charts 
ADD COLUMN transaction_type text DEFAULT 'expense' NOT NULL,
ADD COLUMN grouping_type text DEFAULT 'category' NOT NULL;

-- Add new chart type enum
CREATE TYPE chart_type_enum AS ENUM ('evolution', 'distribution', 'comparison');

-- Add new comparison type enum for comparison charts
CREATE TYPE comparison_type_enum AS ENUM ('categories_same_period', 'category_different_periods', 'subcategories');

-- Add new columns to user_charts table
ALTER TABLE public.user_charts 
ADD COLUMN chart_type chart_type_enum DEFAULT 'evolution' NOT NULL,
ADD COLUMN comparison_type comparison_type_enum,
ADD COLUMN subcategory_id uuid REFERENCES subcategories(id) ON DELETE CASCADE,
ADD COLUMN show_values_on_points boolean DEFAULT true,
ADD COLUMN show_percentages boolean DEFAULT true,
ADD COLUMN show_trend_line boolean DEFAULT false,
ADD COLUMN highlight_min_max boolean DEFAULT false,
ADD COLUMN visual_options jsonb DEFAULT '{}';

-- Update the period_months constraint to include 3 months
ALTER TABLE public.user_charts 
DROP CONSTRAINT user_charts_period_months_check;

ALTER TABLE public.user_charts 
ADD CONSTRAINT user_charts_period_months_check 
CHECK (period_months IN (3, 6, 12, 24));

-- Add constraints for transaction_type and grouping_type
ALTER TABLE public.user_charts 
ADD CONSTRAINT user_charts_transaction_type_check 
CHECK (transaction_type IN ('income', 'expense'));

ALTER TABLE public.user_charts 
ADD CONSTRAINT user_charts_grouping_type_check 
CHECK (grouping_type IN ('category', 'subcategory'));

-- Add index for better performance on new fields
CREATE INDEX idx_user_charts_chart_type ON public.user_charts(chart_type);
CREATE INDEX idx_user_charts_subcategory_id ON public.user_charts(subcategory_id);
CREATE INDEX idx_user_charts_transaction_type ON public.user_charts(transaction_type);
CREATE INDEX idx_user_charts_grouping_type ON public.user_charts(grouping_type);

-- Update existing records to have the default values
UPDATE public.user_charts 
SET 
  chart_type = 'evolution',
  transaction_type = 'expense',
  grouping_type = 'category'
WHERE chart_type IS NULL OR transaction_type IS NULL OR grouping_type IS NULL;

-- Add constraint to ensure comparison_type is set when chart_type is comparison
ALTER TABLE public.user_charts 
ADD CONSTRAINT check_comparison_type 
CHECK (
  (chart_type = 'comparison' AND comparison_type IS NOT NULL) OR 
  (chart_type != 'comparison')
);

-- Add constraint to ensure subcategory_id is only used with subcategory grouping
ALTER TABLE public.user_charts 
ADD CONSTRAINT check_subcategory_grouping 
CHECK (
  (grouping_type = 'subcategory' AND subcategory_id IS NOT NULL) OR 
  (grouping_type = 'category' AND subcategory_id IS NULL)
);

-- Make monthly_goal nullable since some chart types might not need goals
ALTER TABLE public.user_charts 
ALTER COLUMN monthly_goal DROP NOT NULL;

-- Update the monthly_goal constraint to allow 0 or positive values
ALTER TABLE public.user_charts 
DROP CONSTRAINT user_charts_monthly_goal_check;

ALTER TABLE public.user_charts 
ADD CONSTRAINT user_charts_monthly_goal_check 
CHECK (monthly_goal >= 0);
