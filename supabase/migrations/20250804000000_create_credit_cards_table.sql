-- Create ENUM for credit card brands
CREATE TYPE credit_card_brand AS ENUM (
  'visa',
  'mastercard',
  'hipercard', 
  'american_express',
  'elo',
  'outra_bandeira'
);

-- Create credit_cards table
CREATE TABLE IF NOT EXISTS public.credit_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_id UUID NOT NULL REFERENCES public.banks(id),
  limit_amount NUMERIC(12, 2) NOT NULL CHECK (limit_amount > 0),
  description TEXT NOT NULL,
  brand credit_card_brand NOT NULL DEFAULT 'visa',
  closing_day INTEGER NOT NULL CHECK (closing_day >= 1 AND closing_day <= 31),
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  is_archived BOOLEAN DEFAULT false,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Business rule: due_day must be after closing_day
  CONSTRAINT check_due_after_closing CHECK (due_day > closing_day)
);

-- Enable RLS on credit_cards table
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for credit_cards
CREATE POLICY "Users can view their own credit cards"
ON public.credit_cards
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit cards"
ON public.credit_cards
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit cards"
ON public.credit_cards
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit cards"
ON public.credit_cards
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON public.credit_cards (user_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_bank_id ON public.credit_cards (bank_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_is_archived ON public.credit_cards (is_archived);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_credit_cards_updated_at
    BEFORE UPDATE ON public.credit_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add credit_card_id to transaction_credit table for future relationship
ALTER TABLE public.transaction_credit 
ADD COLUMN IF NOT EXISTS credit_card_id UUID REFERENCES public.credit_cards(id);

-- Create index for credit_card_id in transaction_credit
CREATE INDEX IF NOT EXISTS idx_transaction_credit_credit_card_id 
ON public.transaction_credit (credit_card_id);

-- Insert some sample banks if they don't exist
INSERT INTO public.banks (id, name, icon_url) VALUES 
('00000000-0000-0000-0000-000000000002', 'Banco do Brasil', null),
('00000000-0000-0000-0000-000000000003', 'Itaú', null),
('00000000-0000-0000-0000-000000000004', 'Bradesco', null),
('00000000-0000-0000-0000-000000000005', 'Santander', null),
('00000000-0000-0000-0000-000000000006', 'Caixa Econômica Federal', null),
('00000000-0000-0000-0000-000000000007', 'BTG Pactual', null),
('00000000-0000-0000-0000-000000000008', 'Inter', null),
('00000000-0000-0000-0000-000000000009', 'C6 Bank', null),
('00000000-0000-0000-0000-000000000010', 'XP Investimentos', null)
ON CONFLICT (name) DO NOTHING;
