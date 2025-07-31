-- Create transaction_credit table
CREATE TABLE IF NOT EXISTS public.transaction_credit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT NOT NULL,
  original_description TEXT,
  external_id TEXT,
  type VARCHAR(20) DEFAULT 'expense',
  category_id UUID REFERENCES public.categories(id),
  subcategory_id UUID REFERENCES public.subcategories(id),
  bank_id UUID REFERENCES public.banks(id),
  import_session_id UUID REFERENCES public.import_sessions(id),
  user_id UUID REFERENCES auth.users(id),
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency VARCHAR(20),
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on transaction_credit table
ALTER TABLE public.transaction_credit ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for transaction_credit
CREATE POLICY "Users can view their own credit transactions"
ON public.transaction_credit
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit transactions"
ON public.transaction_credit
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit transactions"
ON public.transaction_credit
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit transactions"
ON public.transaction_credit
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transaction_credit_user_id ON public.transaction_credit (user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_credit_date ON public.transaction_credit (date);
CREATE INDEX IF NOT EXISTS idx_transaction_credit_bank_id ON public.transaction_credit (bank_id);
CREATE INDEX IF NOT EXISTS idx_transaction_credit_import_session_id ON public.transaction_credit (import_session_id);
