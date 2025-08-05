-- Execute this SQL script manually in the Supabase SQL Editor
-- This will create the necessary tables and data for file layouts

-- Add code column to banks table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'banks' AND column_name = 'code') THEN
    ALTER TABLE public.banks ADD COLUMN code TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS banks_code_unique ON public.banks(code);
  END IF;
END $$;

-- Insert default banks if they don't exist (using existing structure)
DO $$
BEGIN
  -- Insert Nubank if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.banks WHERE id = '00000000-0000-0000-0000-000000000001') THEN
    INSERT INTO public.banks (id, name, code) VALUES 
      ('00000000-0000-0000-0000-000000000001', 'Nubank', 'nubank');
  ELSE
    -- Update existing Nubank record to add code if missing
    UPDATE public.banks SET code = 'nubank' WHERE id = '00000000-0000-0000-0000-000000000001' AND code IS NULL;
  END IF;
  
  -- Insert Itaú if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.banks WHERE id = '00000000-0000-0000-0000-000000000002') THEN
    INSERT INTO public.banks (id, name, code) VALUES 
      ('00000000-0000-0000-0000-000000000002', 'Itaú', 'itau');
  ELSE
    -- Update existing Itaú record to add code if missing
    UPDATE public.banks SET code = 'itau' WHERE id = '00000000-0000-0000-0000-000000000002' AND code IS NULL;
  END IF;
  
  -- Insert Bradesco if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.banks WHERE id = '00000000-0000-0000-0000-000000000003') THEN
    INSERT INTO public.banks (id, name, code) VALUES 
      ('00000000-0000-0000-0000-000000000003', 'Bradesco', 'bradesco');
  ELSE
    -- Update existing Bradesco record to add code if missing
    UPDATE public.banks SET code = 'bradesco' WHERE id = '00000000-0000-0000-0000-000000000003' AND code IS NULL;
  END IF;
END $$;

-- Create file_layouts table
CREATE TABLE IF NOT EXISTS public.file_layouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  date_column TEXT NOT NULL,
  amount_column TEXT NOT NULL,
  identifier_column TEXT NOT NULL,
  description_column TEXT NOT NULL,
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  decimal_separator TEXT NOT NULL DEFAULT ',',
  thousands_separator TEXT,
  encoding TEXT NOT NULL DEFAULT 'UTF-8',
  delimiter TEXT NOT NULL DEFAULT ',',
  has_header BOOLEAN NOT NULL DEFAULT true,
  sample_file TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on file_layouts table
ALTER TABLE public.file_layouts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for file_layouts (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'file_layouts' 
    AND policyname = 'File layouts are viewable by authenticated users'
  ) THEN
    CREATE POLICY "File layouts are viewable by authenticated users"
    ON public.file_layouts
    FOR SELECT
    USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'file_layouts' 
    AND policyname = 'Only service role can manage file layouts'
  ) THEN
    CREATE POLICY "Only service role can manage file layouts"
    ON public.file_layouts
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_file_layouts_bank_id ON public.file_layouts (bank_id);
CREATE INDEX IF NOT EXISTS idx_file_layouts_is_active ON public.file_layouts (is_active);

-- Insert Nubank layouts (avoid duplicates)
DO $$
BEGIN
  -- Insert Nubank bank layout if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM public.file_layouts 
    WHERE bank_id = '00000000-0000-0000-0000-000000000001' 
    AND name = 'Nubank Padrão'
  ) THEN
    INSERT INTO public.file_layouts (
      bank_id, 
      name, 
      description, 
      date_column, 
      amount_column, 
      identifier_column, 
      description_column,
      date_format,
      decimal_separator,
      thousands_separator,
      encoding,
      delimiter,
      has_header
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      'Nubank Padrão',
      'Layout padrão para extratos do Nubank',
      'Data',
      'Valor',
      'Identificador',
      'Descrição',
      'DD/MM/YYYY',
      ',',
      '.',
      'UTF-8',
      ',',
      true
    );
  END IF;
  
  -- Insert Nubank credit card layout if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM public.file_layouts 
    WHERE bank_id = '00000000-0000-0000-0000-000000000001' 
    AND name = 'Nubank Cartão de Crédito'
  ) THEN
    INSERT INTO public.file_layouts (
      bank_id, 
      name, 
      description, 
      date_column, 
      amount_column, 
      identifier_column, 
      description_column,
      date_format,
      decimal_separator,
      thousands_separator,
      encoding,
      delimiter,
      has_header
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      'Nubank Cartão de Crédito',
      'Layout para extratos de cartão de crédito do Nubank (date,title,amount)',
      'date',
      'amount',
      'title',
      'title',
      'YYYY-MM-DD',
      '.',
      ',',
      'UTF-8',
      ',',
      true
    );
  END IF;
END $$;

-- Verify the data was inserted correctly
SELECT 'Banks created:' as info;
SELECT * FROM public.banks ORDER BY name;

SELECT 'File layouts created:' as info;
SELECT b.name as bank_name, fl.name as layout_name, fl.description 
FROM public.file_layouts fl 
JOIN public.banks b ON fl.bank_id = b.id 
ORDER BY b.name, fl.name;
