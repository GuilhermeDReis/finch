-- Ensure all credit card file layouts have proper file_type and header_pattern

-- Update all Nubank credit card layouts
UPDATE public.file_layouts
SET 
  file_type = 'credit_card',
  header_pattern = ARRAY['date', 'title', 'amount']
WHERE 
  (name ILIKE '%cartão%' OR name ILIKE '%credit%' OR name ILIKE '%card%') 
  AND bank_id = '00000000-0000-0000-0000-000000000001';

-- Also ensure any layout with "Cartão Português" is properly set
UPDATE public.file_layouts
SET 
  file_type = 'credit_card',
  header_pattern = ARRAY['Data', 'Valor', 'Descrição']
WHERE 
  name ILIKE '%cartão português%'
  AND bank_id = '00000000-0000-0000-0000-000000000001';

-- Set file_type for any other credit card related layouts that might exist
UPDATE public.file_layouts
SET file_type = 'credit_card'
WHERE 
  (description ILIKE '%credit%' OR description ILIKE '%cartão%' OR description ILIKE '%card%')
  AND file_type IS NULL;

-- Set file_type to 'bank' for any layouts that don't have it set and are not credit card related
UPDATE public.file_layouts
SET file_type = 'bank'
WHERE 
  file_type IS NULL 
  AND NOT (name ILIKE '%cartão%' OR name ILIKE '%credit%' OR name ILIKE '%card%' 
          OR description ILIKE '%credit%' OR description ILIKE '%cartão%' OR description ILIKE '%card%');
