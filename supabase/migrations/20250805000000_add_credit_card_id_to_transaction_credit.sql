-- Add credit_card_id column to transaction_credit table
ALTER TABLE public.transaction_credit 
ADD COLUMN credit_card_id UUID REFERENCES public.credit_cards(id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_transaction_credit_credit_card_id 
ON public.transaction_credit (credit_card_id);

-- Update types to include the new column
COMMENT ON COLUMN public.transaction_credit.credit_card_id IS 'Reference to the credit card used for this transaction';
