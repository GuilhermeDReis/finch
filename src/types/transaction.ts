export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 
  | 'Transferência'
  | 'PIX'
  | 'Dinheiro'
  | 'Cheque'
  | 'Cartão'
  | 'Cartão de Crédito'
  | 'Cartão de Débito';

export type RecurringFrequency = 'monthly' | 'weekly' | 'yearly';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category_id: string;
  subcategory?: string;
  date: Date;
  payment_method: PaymentMethod;
  tags: string[];
  notes?: string;
  is_recurring: boolean;
  recurring_frequency?: RecurringFrequency;
  created_at: Date;
  updated_at: Date;
}

export interface TransactionFormData {
  type: TransactionType;
  amount: string;
  description: string;
  category_id: string;
  subcategory?: string;
  date: Date;
  payment_method: PaymentMethod;
  tags: string[];
  notes?: string;
  is_recurring: boolean;
  recurring_frequency?: RecurringFrequency;
}