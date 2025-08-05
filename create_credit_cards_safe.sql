-- Execute este SQL no Dashboard do Supabase (SQL Editor)
-- Este script verifica se os objetos já existem antes de criá-los

-- 1. Criar o enum credit_card_brand apenas se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credit_card_brand') THEN
    CREATE TYPE credit_card_brand AS ENUM (
      'visa',
      'mastercard', 
      'hipercard',
      'american_express',
      'elo',
      'outra_bandeira'
    );
  END IF;
END
$$;

-- 2. Criar a tabela credit_cards apenas se não existir
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

-- 3. Habilitar RLS se ainda não estiver habilitado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c 
    JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE c.relname = 'credit_cards' 
    AND n.nspname = 'public' 
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;

-- 4. Criar políticas RLS apenas se não existirem
DO $$
BEGIN
  -- Policy para SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'credit_cards' 
    AND policyname = 'Users can view their own credit cards'
  ) THEN
    CREATE POLICY "Users can view their own credit cards"
    ON public.credit_cards
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  -- Policy para INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'credit_cards' 
    AND policyname = 'Users can insert their own credit cards'
  ) THEN
    CREATE POLICY "Users can insert their own credit cards"
    ON public.credit_cards
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Policy para UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'credit_cards' 
    AND policyname = 'Users can update their own credit cards'
  ) THEN
    CREATE POLICY "Users can update their own credit cards"
    ON public.credit_cards
    FOR UPDATE  
    USING (auth.uid() = user_id);
  END IF;

  -- Policy para DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'credit_cards' 
    AND policyname = 'Users can delete their own credit cards'
  ) THEN
    CREATE POLICY "Users can delete their own credit cards"
    ON public.credit_cards
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END
$$;

-- 5. Criar índices apenas se não existirem
CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON public.credit_cards (user_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_bank_id ON public.credit_cards (bank_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_is_archived ON public.credit_cards (is_archived);

-- 6. Criar função de trigger apenas se não existir
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Criar trigger apenas se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_credit_cards_updated_at'
  ) THEN
    CREATE TRIGGER update_credit_cards_updated_at
        BEFORE UPDATE ON public.credit_cards
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

-- 8. Adicionar coluna credit_card_id à tabela transaction_credit apenas se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transaction_credit' 
    AND column_name = 'credit_card_id'
  ) THEN
    ALTER TABLE public.transaction_credit 
    ADD COLUMN credit_card_id UUID REFERENCES public.credit_cards(id);
  END IF;
END
$$;

-- 9. Criar índice para a nova coluna apenas se não existir
CREATE INDEX IF NOT EXISTS idx_transaction_credit_credit_card_id 
ON public.transaction_credit (credit_card_id);

-- 10. Verificar se tudo foi criado corretamente
SELECT 
  'credit_card_brand enum' as object_type,
  CASE WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credit_card_brand') 
       THEN 'EXISTS' ELSE 'NOT FOUND' END as status
UNION ALL
SELECT 
  'credit_cards table' as object_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_cards') 
       THEN 'EXISTS' ELSE 'NOT FOUND' END as status
UNION ALL
SELECT 
  'RLS enabled' as object_type,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_class c 
    JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE c.relname = 'credit_cards' 
    AND n.nspname = 'public' 
    AND c.relrowsecurity = true
  ) THEN 'ENABLED' ELSE 'DISABLED' END as status;
