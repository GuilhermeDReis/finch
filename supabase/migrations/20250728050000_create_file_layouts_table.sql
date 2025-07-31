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

-- Create RLS policies for file_layouts
CREATE POLICY "File layouts are viewable by authenticated users"
ON public.file_layouts
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Only service role can manage file layouts"
ON public.file_layouts
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_file_layouts_bank_id ON public.file_layouts (bank_id);
CREATE INDEX IF NOT EXISTS idx_file_layouts_is_active ON public.file_layouts (is_active);

-- Insert sample layout for Nubank
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
)
ON CONFLICT DO NOTHING;
