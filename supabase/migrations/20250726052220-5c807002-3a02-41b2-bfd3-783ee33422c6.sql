-- Add order field to user_charts table for drag and drop functionality
ALTER TABLE public.user_charts 
ADD COLUMN display_order INTEGER DEFAULT 0;

-- Update existing records to have sequential order
UPDATE public.user_charts 
SET display_order = row_number() OVER (PARTITION BY user_id ORDER BY created_at);

-- Create index for better performance
CREATE INDEX idx_user_charts_display_order ON public.user_charts(user_id, display_order);