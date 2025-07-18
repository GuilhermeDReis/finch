-- Remove icon column from categories table
ALTER TABLE public.categories DROP COLUMN IF EXISTS icon;