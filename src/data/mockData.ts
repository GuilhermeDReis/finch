import { Category, Transaction, PaymentMethod } from '@/types/transaction';

export const incomeCategories: Category[] = [
  { id: '1', name: 'Salário', type: 'income', color: '#10B981' },
  { id: '2', name: 'Freelance', type: 'income', color: '#3B82F6' },
  { id: '3', name: 'Investimentos', type: 'income', color: '#8B5CF6' },
  { id: '4', name: 'Vendas', type: 'income', color: '#06B6D4' },
  { id: '5', name: 'Bonificações', type: 'income', color: '#F59E0B' },
];

export const expenseCategories: Category[] = [
  { id: '6', name: 'Alimentação', type: 'expense', color: '#EF4444' },
  { id: '7', name: 'Transporte', type: 'expense', color: '#F97316' },
  { id: '8', name: 'Moradia', type: 'expense', color: '#84CC16' },
  { id: '9', name: 'Saúde', type: 'expense', color: '#06B6D4' },
  { id: '10', name: 'Educação', type: 'expense', color: '#8B5CF6' },
  { id: '11', name: 'Lazer', type: 'expense', color: '#EC4899' },
  { id: '12', name: 'Compras', type: 'expense', color: '#6B7280' },
];

export const incomePaymentMethods: PaymentMethod[] = [
  'Transferência',
  'PIX',
  'Dinheiro',
  'Cheque',
  'Cartão'
];

export const expensePaymentMethods: PaymentMethod[] = [
  'Cartão de Crédito',
  'Cartão de Débito',
  'PIX',
  'Dinheiro',
  'Transferência'
];

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'income',
    amount: 5000,
    description: 'Salário de Janeiro',
    category_id: '1',
    subcategory: 'Salário base',
    date: new Date('2024-01-01'),
    payment_method: 'Transferência',
    tags: ['trabalho', 'mensal'],
    notes: 'Salário regular',
    is_recurring: true,
    recurring_frequency: 'monthly',
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: '2',
    type: 'expense',
    amount: 350,
    description: 'Compras no supermercado',
    category_id: '6',
    subcategory: 'Supermercado',
    date: new Date('2024-01-02'),
    payment_method: 'Cartão de Crédito',
    tags: ['alimentação', 'casa'],
    notes: 'Compras da semana',
    is_recurring: false,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: '3',
    type: 'expense',
    amount: 80,
    description: 'Combustível',
    category_id: '7',
    subcategory: 'Gasolina',
    date: new Date('2024-01-03'),
    payment_method: 'Cartão de Débito',
    tags: ['transporte', 'carro'],
    is_recurring: false,
    created_at: new Date(),
    updated_at: new Date(),
  },
];