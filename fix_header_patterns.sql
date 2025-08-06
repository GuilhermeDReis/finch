-- Fix missing header_pattern data for Nubank layouts
-- This should have been applied by migration 20250805221500_add_auto_detection_to_file_layouts.sql

-- First, ensure the columns exist
ALTER TABLE public.file_layouts
ADD COLUMN IF NOT EXISTS file_type TEXT;

ALTER TABLE public.file_layouts
ADD COLUMN IF NOT EXISTS header_pattern TEXT[];

-- Update Nubank Bank Layout (Padrão)
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

-- Verify the changes
SELECT name, file_type, header_pattern 
FROM public.file_layouts 
WHERE bank_id = '00000000-0000-0000-0000-000000000001';
