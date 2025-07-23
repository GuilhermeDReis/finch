-- Create categories table for transaction categorization
CREATE TABLE public.categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    color TEXT DEFAULT '#6B7280',
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subcategories table
CREATE TABLE public.subcategories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table (enhanced version)
CREATE TABLE public.transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    external_id TEXT, -- ID_Transacao from CSV
    date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    original_description TEXT, -- Original description from CSV
    category_id UUID REFERENCES public.categories(id),
    subcategory_id UUID REFERENCES public.subcategories(id),
    payment_method TEXT,
    tags TEXT[],
    notes TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency TEXT,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    import_session_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, external_id)
);

-- Create import sessions table
CREATE TABLE public.import_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for categories (public read for all authenticated users)
CREATE POLICY "Categories are viewable by authenticated users" 
ON public.categories 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Categories can be managed by authenticated users" 
ON public.categories 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Create policies for subcategories
CREATE POLICY "Subcategories are viewable by authenticated users" 
ON public.subcategories 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Subcategories can be managed by authenticated users" 
ON public.subcategories 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Create policies for transactions
CREATE POLICY "Users can view their own transactions" 
ON public.transactions 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" 
ON public.transactions 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" 
ON public.transactions 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" 
ON public.transactions 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Create policies for import sessions
CREATE POLICY "Users can view their own import sessions" 
ON public.import_sessions 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own import sessions" 
ON public.import_sessions 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own import sessions" 
ON public.import_sessions 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.categories (name, type, color, icon) VALUES
-- Income categories
('Salário', 'income', '#10B981', 'Banknote'),
('Freelance', 'income', '#059669', 'Briefcase'),
('Investimentos', 'income', '#047857', 'TrendingUp'),
('Vendas', 'income', '#065F46', 'ShoppingBag'),
('Outros Recebimentos', 'income', '#064E3B', 'Plus'),

-- Expense categories
('Alimentação', 'expense', '#EF4444', 'Utensils'),
('Transporte', 'expense', '#DC2626', 'Car'),
('Moradia', 'expense', '#B91C1C', 'Home'),
('Saúde', 'expense', '#991B1B', 'Heart'),
('Educação', 'expense', '#7F1D1D', 'GraduationCap'),
('Lazer', 'expense', '#F59E0B', 'Gamepad2'),
('Compras', 'expense', '#D97706', 'ShoppingCart'),
('Contas', 'expense', '#B45309', 'Receipt'),
('Outros Gastos', 'expense', '#92400E', 'Minus');

-- Insert default subcategories
INSERT INTO public.subcategories (name, category_id) VALUES
-- Salário subcategories
('Salário Base', (SELECT id FROM public.categories WHERE name = 'Salário')),
('Horas Extras', (SELECT id FROM public.categories WHERE name = 'Salário')),
('13º Salário', (SELECT id FROM public.categories WHERE name = 'Salário')),
('Férias', (SELECT id FROM public.categories WHERE name = 'Salário')),

-- Alimentação subcategories
('Supermercado', (SELECT id FROM public.categories WHERE name = 'Alimentação')),
('Restaurante', (SELECT id FROM public.categories WHERE name = 'Alimentação')),
('Delivery', (SELECT id FROM public.categories WHERE name = 'Alimentação')),
('Lanche', (SELECT id FROM public.categories WHERE name = 'Alimentação')),

-- Transporte subcategories
('Combustível', (SELECT id FROM public.categories WHERE name = 'Transporte')),
('Uber/Taxi', (SELECT id FROM public.categories WHERE name = 'Transporte')),
('Transporte Público', (SELECT id FROM public.categories WHERE name = 'Transporte')),
('Manutenção Veículo', (SELECT id FROM public.categories WHERE name = 'Transporte')),

-- Moradia subcategories
('Aluguel', (SELECT id FROM public.categories WHERE name = 'Moradia')),
('Condomínio', (SELECT id FROM public.categories WHERE name = 'Moradia')),
('Energia Elétrica', (SELECT id FROM public.categories WHERE name = 'Moradia')),
('Água', (SELECT id FROM public.categories WHERE name = 'Moradia')),
('Internet', (SELECT id FROM public.categories WHERE name = 'Moradia')),

-- Lazer subcategories
('Cinema', (SELECT id FROM public.categories WHERE name = 'Lazer')),
('Viagem', (SELECT id FROM public.categories WHERE name = 'Lazer')),
('Academia', (SELECT id FROM public.categories WHERE name = 'Lazer')),
('Streaming', (SELECT id FROM public.categories WHERE name = 'Lazer'));