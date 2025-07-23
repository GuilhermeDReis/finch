-- Inserir categorias padrão se não existirem
INSERT INTO public.categories (name, type, icon, color) VALUES
('Alimentação', 'expense', '🍽️', '#ef4444'),
('Transporte', 'expense', '🚗', '#f97316'),
('Saúde', 'expense', '⚕️', '#10b981'),
('Educação', 'expense', '📚', '#3b82f6'),
('Lazer', 'expense', '🎮', '#8b5cf6'),
('Casa', 'expense', '🏠', '#6b7280'),
('Vestuário', 'expense', '👕', '#ec4899'),
('Outros Gastos', 'expense', '💰', '#64748b'),
('Salário', 'income', '💼', '#22c55e'),
('Freelance', 'income', '💻', '#06b6d4'),
('Investimentos', 'income', '📈', '#eab308'),
('Outros Rendimentos', 'income', '💸', '#84cc16')
ON CONFLICT (name) DO NOTHING;

-- Inserir subcategorias padrão
INSERT INTO public.subcategories (name, category_id) VALUES
-- Alimentação
('Supermercado', (SELECT id FROM categories WHERE name = 'Alimentação' LIMIT 1)),
('Restaurante', (SELECT id FROM categories WHERE name = 'Alimentação' LIMIT 1)),
('Lanche', (SELECT id FROM categories WHERE name = 'Alimentação' LIMIT 1)),

-- Transporte
('Combustível', (SELECT id FROM categories WHERE name = 'Transporte' LIMIT 1)),
('Uber/Taxi', (SELECT id FROM categories WHERE name = 'Transporte' LIMIT 1)),
('Transporte Público', (SELECT id FROM categories WHERE name = 'Transporte' LIMIT 1)),

-- Saúde
('Médico', (SELECT id FROM categories WHERE name = 'Saúde' LIMIT 1)),
('Farmácia', (SELECT id FROM categories WHERE name = 'Saúde' LIMIT 1)),
('Plano de Saúde', (SELECT id FROM categories WHERE name = 'Saúde' LIMIT 1)),

-- Casa
('Aluguel', (SELECT id FROM categories WHERE name = 'Casa' LIMIT 1)),
('Conta de Luz', (SELECT id FROM categories WHERE name = 'Casa' LIMIT 1)),
('Conta de Água', (SELECT id FROM categories WHERE name = 'Casa' LIMIT 1)),
('Internet', (SELECT id FROM categories WHERE name = 'Casa' LIMIT 1))
ON CONFLICT (name, category_id) DO NOTHING;