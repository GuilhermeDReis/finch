-- Fix category_id to be nullable for charts that don't require specific categories
-- This allows charts like "distribution of all categories" to work properly

-- Make category_id nullable
ALTER TABLE public.user_charts ALTER COLUMN category_id DROP NOT NULL;

-- Add a constraint to ensure category_id is provided when needed
ALTER TABLE public.user_charts ADD CONSTRAINT check_category_id_when_needed CHECK (
    -- For evolution charts
    (chart_type = 'evolution' AND 
     ((grouping_type = 'category' AND category_id IS NOT NULL) OR 
      (grouping_type = 'subcategory' AND category_id IS NOT NULL AND subcategory_id IS NOT NULL) OR
      (grouping_type = 'category' AND category_id IS NULL))) -- all categories case
    OR
    -- For distribution charts
    (chart_type = 'distribution' AND 
     (category_id IS NOT NULL OR category_id IS NULL)) -- can be null for "all categories"
    OR
    -- For comparison charts
    (chart_type = 'comparison' AND 
     ((comparison_type = 'categories_same_period' AND category_id IS NULL) OR -- comparing all categories
      (comparison_type = 'category_different_periods' AND category_id IS NOT NULL) OR
      (comparison_type = 'subcategories' AND category_id IS NOT NULL AND subcategory_id IS NOT NULL)))
    OR
    -- For legacy charts (backward compatibility)
    chart_type IS NULL
);
