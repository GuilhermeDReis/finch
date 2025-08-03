-- Add mapping_type field to transaction_mappings table to differentiate credit card mappings
-- This migration ensures the column exists and is properly configured

-- Check if the column already exists and add it if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transaction_mappings' 
        AND column_name = 'mapping_type'
    ) THEN
        ALTER TABLE public.transaction_mappings
        ADD COLUMN mapping_type VARCHAR(20) DEFAULT 'bank';
    END IF;
END $$;

-- Add check constraint for mapping_type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transaction_mappings_mapping_type_check'
    ) THEN
        ALTER TABLE public.transaction_mappings
        ADD CONSTRAINT transaction_mappings_mapping_type_check
        CHECK (mapping_type IN ('bank', 'credit_card'));
    END IF;
END $$;

-- Create index for better performance on mapping_type queries if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_transaction_mappings_mapping_type
ON public.transaction_mappings (mapping_type);

-- Create composite index for efficient querying by user, type and mapping_type if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_transaction_mappings_user_type_mapping
ON public.transaction_mappings (user_id, mapping_type, source);

-- Update existing records to have proper mapping_type based on source
UPDATE public.transaction_mappings
SET mapping_type = CASE
    WHEN source LIKE '%Credit%' OR source LIKE '%CREDIT%' THEN 'credit_card'
    ELSE 'bank'
END
WHERE mapping_type IS NULL OR mapping_type = '';

-- Make mapping_type NOT NULL after setting default values
ALTER TABLE public.transaction_mappings 
ALTER COLUMN mapping_type SET NOT NULL;

-- Add comment to document the new field
COMMENT ON COLUMN public.transaction_mappings.mapping_type IS 'Type of mapping: bank for regular transactions, credit_card for credit card transactions';
