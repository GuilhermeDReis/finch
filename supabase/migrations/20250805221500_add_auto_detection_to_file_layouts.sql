
-- Migration to add automatic layout detection capabilities to file_layouts table

-- 1. Add file_type column to identify layout as 'banking' or 'credit_card'
ALTER TABLE public.file_layouts
ADD COLUMN IF NOT EXISTS file_type TEXT;

-- 2. Add header_pattern column to store the expected headers for matching
ALTER TABLE public.file_layouts
ADD COLUMN IF NOT EXISTS header_pattern TEXT[];

-- 3. Update existing Nubank layouts with the new columns
-- Update Nubank Bank Layout
UPDATE public.file_layouts
SET 
  file_type = 'bank',
  header_pattern = ARRAY['Data', 'Valor', 'Identificador', 'Descrição']
WHERE 
  bank_id = '00000000-0000-0000-0000-000000000001' AND
  name = 'Nubank Padrão';

-- Update Nubank Credit Card Layout
UPDATE public.file_layouts
SET 
  file_type = 'credit_card',
  header_pattern = ARRAY['date', 'title', 'amount']
WHERE 
  bank_id = '00000000-0000-0000-0000-000000000001' AND
  name = 'Nubank Cartão de Crédito';

