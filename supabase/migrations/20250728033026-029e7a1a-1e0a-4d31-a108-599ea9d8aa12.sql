-- Security Fix: Add user ownership to categories and subcategories

-- Add user_id column to categories table
ALTER TABLE public.categories ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to subcategories table  
ALTER TABLE public.subcategories ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing categories to be owned by the first user (if any users exist)
-- In production, you'd want to handle this migration more carefully
UPDATE public.categories 
SET user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE user_id IS NULL;

-- Update existing subcategories to be owned by the first user (if any users exist)
UPDATE public.subcategories 
SET user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE user_id IS NULL;

-- Make user_id NOT NULL after setting values
ALTER TABLE public.categories ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.subcategories ALTER COLUMN user_id SET NOT NULL;

-- Drop the overly permissive RLS policies
DROP POLICY "Categories are viewable by authenticated users" ON public.categories;
DROP POLICY "Categories can be managed by authenticated users" ON public.categories;
DROP POLICY "Subcategories are viewable by authenticated users" ON public.subcategories;
DROP POLICY "Subcategories can be managed by authenticated users" ON public.subcategories;

-- Create secure RLS policies for categories
CREATE POLICY "Users can view their own categories" 
ON public.categories 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories" 
ON public.categories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" 
ON public.categories 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" 
ON public.categories 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create secure RLS policies for subcategories
CREATE POLICY "Users can view their own subcategories" 
ON public.subcategories 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subcategories" 
ON public.subcategories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subcategories" 
ON public.subcategories 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subcategories" 
ON public.subcategories 
FOR DELETE 
USING (auth.uid() = user_id);

-- Fix database function security issues
-- Update handle_new_user function to use proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

-- Ensure update_updated_at_column has proper security context
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;