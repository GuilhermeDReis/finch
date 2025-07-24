-- Add missing fields to user_charts table
ALTER TABLE public.user_charts 
ADD COLUMN IF NOT EXISTS transaction_type text DEFAULT 'expense' CHECK (transaction_type IN ('income', 'expense'));

ALTER TABLE public.user_charts 
ADD COLUMN IF NOT EXISTS grouping_type text DEFAULT 'category' CHECK (grouping_type IN ('category', 'subcategory'));