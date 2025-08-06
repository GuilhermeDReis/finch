-- Add missing columns to banks table
ALTER TABLE public.banks 
ADD COLUMN IF NOT EXISTS code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing banks with codes
UPDATE public.banks 
SET code = 'nubank', is_active = true 
WHERE name = 'Nubank' AND code IS NULL;

-- Insert other banks
INSERT INTO public.banks (id, name, code, is_active, icon_url) VALUES 
('00000000-0000-0000-0000-000000000002', 'Itaú', 'itau', true, null),
('00000000-0000-0000-0000-000000000003', 'Bradesco', 'bradesco', true, null)
ON CONFLICT (id) DO UPDATE SET 
  code = EXCLUDED.code,
  is_active = EXCLUDED.is_active;

-- Add layout for the test CSV format (Portuguese headers)
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
  'Nubank Cartão Português',
  'Layout para extratos de cartão de crédito do Nubank com cabeçalhos em português',
  'Data',
  'Valor',
  'Descrição',
  'Descrição',
  'YYYY-MM-DD',
  ',',
  '.',
  'UTF-8',
  ',',
  true
)
ON CONFLICT DO NOTHING;

-- Update RLS policies to allow proper access
DROP POLICY IF EXISTS "Banks are viewable by authenticated users" ON public.banks;
CREATE POLICY "Banks are viewable by all authenticated users"
ON public.banks
FOR SELECT
USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

DROP POLICY IF EXISTS "File layouts are viewable by authenticated users" ON public.file_layouts;
CREATE POLICY "File layouts are viewable by all authenticated users"
ON public.file_layouts
FOR SELECT
USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
