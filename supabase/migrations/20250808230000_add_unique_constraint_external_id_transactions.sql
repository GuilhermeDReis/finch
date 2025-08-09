-- Add unique constraint on external_id for transactions table
-- This is needed for upsert operations based on external_id

ALTER TABLE public.transactions 
ADD CONSTRAINT unique_external_id_transactions 
UNIQUE (external_id);

-- Create index for better performance on external_id lookups
CREATE INDEX IF NOT EXISTS idx_transactions_external_id ON public.transactions (external_id);
