-- Add unique constraint on external_id for transaction_credit table
-- This is needed for upsert operations based on external_id

ALTER TABLE public.transaction_credit 
ADD CONSTRAINT unique_external_id_transaction_credit 
UNIQUE (external_id);

-- Create index for better performance on external_id lookups
CREATE INDEX IF NOT EXISTS idx_transaction_credit_external_id ON public.transaction_credit (external_id);
