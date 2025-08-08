-- Remove icon_url column from banks table
-- This field is no longer used for credit card display
-- Credit cards now use background_image_url field instead

ALTER TABLE public.banks DROP COLUMN IF EXISTS icon_url;

-- Add comment to document the change
COMMENT ON TABLE public.banks IS 'Banks table - icon_url field removed as credit cards now use background_image_url';