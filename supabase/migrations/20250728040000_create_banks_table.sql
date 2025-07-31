-- Create banks table
CREATE TABLE IF NOT EXISTS public.banks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on banks table
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for banks
CREATE POLICY "Banks are viewable by authenticated users"
ON public.banks
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Only service role can manage banks"
ON public.banks
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Insert Nubank as the first bank
INSERT INTO public.banks (id, name, icon_url) 
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Nubank',
  'https://nubank.com.br/images/logo.png'
)
ON CONFLICT (name) DO NOTHING;

-- Add bank_id column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS bank_id UUID REFERENCES public.banks(id);

-- Create index for bank_id
CREATE INDEX IF NOT EXISTS idx_transactions_bank_id ON public.transactions (bank_id);

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'transactions_bank_id_fkey'
  ) THEN
    ALTER TABLE public.transactions 
    ADD CONSTRAINT transactions_bank_id_fkey 
    FOREIGN KEY (bank_id) REFERENCES public.banks(id);
  END IF;
END $$;

-- Update RLS policy for transactions to include bank information
-- This allows users to view transactions with bank information
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions"
ON public.transactions
FOR SELECT
USING (
  auth.uid() = user_id
  OR (
    auth.role() = 'service_role'
    AND EXISTS (SELECT 1 FROM public.banks WHERE banks.id = transactions.bank_id)
  )
);
