-- Add support for chart wizard with new chart types (Safe version)
-- This migration extends the user_charts table to support Evolution, Distribution, and Comparison charts

-- Add columns only if they don't exist
DO $$ 
BEGIN
    -- Add transaction_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_charts' AND column_name = 'transaction_type') THEN
        ALTER TABLE public.user_charts ADD COLUMN transaction_type text DEFAULT 'expense' NOT NULL;
    END IF;
    
    -- Add grouping_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_charts' AND column_name = 'grouping_type') THEN
        ALTER TABLE public.user_charts ADD COLUMN grouping_type text DEFAULT 'category' NOT NULL;
    END IF;
END $$;

-- Create enums only if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chart_type_enum') THEN
        CREATE TYPE chart_type_enum AS ENUM ('evolution', 'distribution', 'comparison');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comparison_type_enum') THEN
        CREATE TYPE comparison_type_enum AS ENUM ('categories_same_period', 'category_different_periods', 'subcategories');
    END IF;
END $$;

-- Add new columns only if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_charts' AND column_name = 'chart_type') THEN
        ALTER TABLE public.user_charts ADD COLUMN chart_type chart_type_enum DEFAULT 'evolution' NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_charts' AND column_name = 'comparison_type') THEN
        ALTER TABLE public.user_charts ADD COLUMN comparison_type comparison_type_enum;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_charts' AND column_name = 'subcategory_id') THEN
        ALTER TABLE public.user_charts ADD COLUMN subcategory_id uuid REFERENCES subcategories(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_charts' AND column_name = 'show_values_on_points') THEN
        ALTER TABLE public.user_charts ADD COLUMN show_values_on_points boolean DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_charts' AND column_name = 'show_percentages') THEN
        ALTER TABLE public.user_charts ADD COLUMN show_percentages boolean DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_charts' AND column_name = 'show_trend_line') THEN
        ALTER TABLE public.user_charts ADD COLUMN show_trend_line boolean DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_charts' AND column_name = 'highlight_min_max') THEN
        ALTER TABLE public.user_charts ADD COLUMN highlight_min_max boolean DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_charts' AND column_name = 'visual_options') THEN
        ALTER TABLE public.user_charts ADD COLUMN visual_options jsonb DEFAULT '{}';
    END IF;
END $$;

-- Update the period_months constraint safely
DO $$ 
BEGIN
    -- Drop constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_charts_period_months_check') THEN
        ALTER TABLE public.user_charts DROP CONSTRAINT user_charts_period_months_check;
    END IF;
    
    -- Add new constraint
    ALTER TABLE public.user_charts ADD CONSTRAINT user_charts_period_months_check CHECK (period_months IN (3, 6, 12, 24));
END $$;

-- Add constraints safely
DO $$ 
BEGIN
    -- Add transaction_type constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_charts_transaction_type_check') THEN
        ALTER TABLE public.user_charts ADD CONSTRAINT user_charts_transaction_type_check CHECK (transaction_type IN ('income', 'expense'));
    END IF;
    
    -- Add grouping_type constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_charts_grouping_type_check') THEN
        ALTER TABLE public.user_charts ADD CONSTRAINT user_charts_grouping_type_check CHECK (grouping_type IN ('category', 'subcategory'));
    END IF;
    
    -- Add comparison_type constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_comparison_type') THEN
        ALTER TABLE public.user_charts ADD CONSTRAINT check_comparison_type CHECK (
            (chart_type = 'comparison' AND comparison_type IS NOT NULL) OR 
            (chart_type != 'comparison')
        );
    END IF;
    
    -- Add subcategory_grouping constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_subcategory_grouping') THEN
        ALTER TABLE public.user_charts ADD CONSTRAINT check_subcategory_grouping CHECK (
            (grouping_type = 'subcategory' AND subcategory_id IS NOT NULL) OR 
            (grouping_type = 'category' AND subcategory_id IS NULL)
        );
    END IF;
END $$;

-- Create indexes safely
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_charts_chart_type') THEN
        CREATE INDEX idx_user_charts_chart_type ON public.user_charts(chart_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_charts_subcategory_id') THEN
        CREATE INDEX idx_user_charts_subcategory_id ON public.user_charts(subcategory_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_charts_transaction_type') THEN
        CREATE INDEX idx_user_charts_transaction_type ON public.user_charts(transaction_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_charts_grouping_type') THEN
        CREATE INDEX idx_user_charts_grouping_type ON public.user_charts(grouping_type);
    END IF;
END $$;

-- Update existing records to have the default values
UPDATE public.user_charts 
SET 
  chart_type = COALESCE(chart_type, 'evolution'),
  transaction_type = COALESCE(transaction_type, 'expense'),
  grouping_type = COALESCE(grouping_type, 'category')
WHERE chart_type IS NULL OR transaction_type IS NULL OR grouping_type IS NULL;

-- Make monthly_goal nullable safely
DO $$ 
BEGIN
    -- Check if column is NOT NULL and change it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_charts' 
        AND column_name = 'monthly_goal' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.user_charts ALTER COLUMN monthly_goal DROP NOT NULL;
    END IF;
END $$;

-- Update the monthly_goal constraint safely
DO $$ 
BEGIN
    -- Drop constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_charts_monthly_goal_check') THEN
        ALTER TABLE public.user_charts DROP CONSTRAINT user_charts_monthly_goal_check;
    END IF;
    
    -- Add new constraint
    ALTER TABLE public.user_charts ADD CONSTRAINT user_charts_monthly_goal_check CHECK (monthly_goal >= 0);
END $$;
