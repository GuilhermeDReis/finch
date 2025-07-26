-- Add order field to user_charts table for drag and drop functionality
ALTER TABLE public.user_charts 
ADD COLUMN display_order INTEGER DEFAULT 0;

-- Create a temporary sequence for ordering existing records
CREATE TEMP SEQUENCE temp_order_seq;

-- Update existing records to have sequential order using a subquery
WITH ordered_charts AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as new_order
  FROM public.user_charts
)
UPDATE public.user_charts 
SET display_order = ordered_charts.new_order
FROM ordered_charts
WHERE public.user_charts.id = ordered_charts.id;

-- Create index for better performance
CREATE INDEX idx_user_charts_display_order ON public.user_charts(user_id, display_order);