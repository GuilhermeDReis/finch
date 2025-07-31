-- Add Nubank Credit Card layout
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
)
ON CONFLICT DO NOTHING;
