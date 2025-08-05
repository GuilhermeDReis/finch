-- Add mapping_type field to transaction_mappings table to differentiate credit card mappings
ALTER TABLE public.transaction_mappings 
ADD COLUMN IF NOT EXISTS mapping_type VARCHAR(20) DEFAULT 'bank';

-- Add check constraint for mapping_type
ALTER TABLE public.transaction_mappings 
ADD CONSTRAINT transaction_mappings_mapping_type_check 
CHECK (mapping_type IN ('bank', 'credit_card'));

-- Create index for better performance on mapping_type queries
CREATE INDEX IF NOT EXISTS idx_transaction_mappings_mapping_type 
ON public.transaction_mappings (mapping_type);

-- Create composite index for efficient querying by user, type and mapping_type
CREATE INDEX IF NOT EXISTS idx_transaction_mappings_user_type_mapping 
ON public.transaction_mappings (user_id, mapping_type, source);

-- Update existing records to have proper mapping_type based on source
UPDATE public.transaction_mappings 
SET mapping_type = CASE 
  WHEN source LIKE '%Credit%' THEN 'credit_card'
  ELSE 'bank'
END
WHERE mapping_type = 'bank' OR mapping_type IS NULL;

-- Add comment to document the new field
COMMENT ON COLUMN public.transaction_mappings.mapping_type IS 'Type of mapping: bank for regular transactions, credit_card for credit card transactions';
