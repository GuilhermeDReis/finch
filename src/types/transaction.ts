
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

export type TransactionStatus = 'normal' | 'refunded' | 'unified-pix' | 'hidden';

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

export interface AISuggestion {
  categoryId: string;
  confidence: number;
  reasoning?: string;
  isAISuggested?: boolean;
  usedFallback?: boolean;
}

export interface TransactionRow {
  id: string;
  date: string;
  amount: number;
  description: string;
  originalDescription: string;
  type: TransactionType;
  selected: boolean;
  categoryId?: string;
  subcategoryId?: string;
  editedDescription?: string;
  isEditing?: boolean;
  aiSuggestion?: AISuggestion;
  status?: TransactionStatus;
  groupedWith?: string[]; // IDs of transactions this is grouped with
  groupType?: 'refund' | 'pix-credit';
  isGrouped?: boolean;
}

export interface RefundedTransaction {
  id: string;
  originalTransaction: TransactionRow;
  refundTransaction: TransactionRow;
  status: 'refunded';
}

export interface UnifiedPixTransaction {
  id: string;
  creditTransaction: TransactionRow;
  pixTransaction: TransactionRow;
  status: 'unified-pix';
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
