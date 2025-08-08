-- Remove icon_url from banks table (no longer needed for credit cards)
-- Note: We're not dropping the column to avoid breaking existing functionality
-- Just adding a comment that it's deprecated for credit cards

-- Add background_image_url to credit_cards table
ALTER TABLE public.credit_cards 
ADD COLUMN background_image_url TEXT;

-- Add comment to the new column
COMMENT ON COLUMN public.credit_cards.background_image_url IS 'URL of the background image for the credit card display';

-- Add comment to banks.icon_url indicating it's deprecated for credit cards
COMMENT ON COLUMN public.banks.icon_url IS 'Bank icon URL - deprecated for credit card display, use credit_cards.background_image_url instead';