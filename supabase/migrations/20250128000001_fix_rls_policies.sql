-- Fix RLS policies for banks and file_layouts tables to allow proper access

-- Update RLS policies for banks table
DROP POLICY IF EXISTS "Banks are viewable by authenticated users" ON public.banks;
DROP POLICY IF EXISTS "Banks are viewable by all authenticated users" ON public.banks;

CREATE POLICY "Banks are viewable by all users"
ON public.banks
FOR SELECT
USING (true); -- Allow all users to read banks

-- Update RLS policies for file_layouts table  
DROP POLICY IF EXISTS "File layouts are viewable by authenticated users" ON public.file_layouts;
DROP POLICY IF EXISTS "File layouts are viewable by all authenticated users" ON public.file_layouts;

CREATE POLICY "File layouts are viewable by all users"
ON public.file_layouts
FOR SELECT
USING (true); -- Allow all users to read file layouts
