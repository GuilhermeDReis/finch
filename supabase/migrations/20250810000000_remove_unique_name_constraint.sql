-- Remove the unique constraint on (user_id, name) from user_charts table
-- This allows users to have multiple charts with the same name

DO $$ 
BEGIN
    -- Drop the unique constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_charts_user_id_name_key') THEN
        ALTER TABLE public.user_charts DROP CONSTRAINT user_charts_user_id_name_key;
    END IF;
    
    -- Also check for alternative constraint names that might exist
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_charts_user_id_name_unique') THEN
        ALTER TABLE public.user_charts DROP CONSTRAINT user_charts_user_id_name_unique;
    END IF;
END $$;
