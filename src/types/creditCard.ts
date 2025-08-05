import { Tables, TablesInsert, TablesUpdate, Enums } from '@/integrations/supabase/types';

// Database types
export type CreditCard = Tables<'credit_cards'>;
export type CreditCardInsert = TablesInsert<'credit_cards'>;
export type CreditCardUpdate = TablesUpdate<'credit_cards'>;
export type CreditCardBrand = Enums<'credit_card_brand'>;

// Extended types with relations
export interface CreditCardWithBank extends CreditCard {
  banks?: {
    id: string;
    name: string;
    icon_url: string | null;
  };
  last_four_digits?: string;
}

// Form types
export interface CreditCardFormData {
  bank_id: string;
  limit_amount: number;
  description: string;
  brand: CreditCardBrand;
  closing_day: number;
  due_day: number;
  last_four_digits: string;
}

// Credit card brand options for UI
export const CREDIT_CARD_BRANDS = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'hipercard', label: 'HiperCard' },
  { value: 'american_express', label: 'American Express' },
  { value: 'elo', label: 'Elo' },
  { value: 'outra_bandeira', label: 'Outra Bandeira' },
] as const;

// Bill calculation types
export interface CreditCardBill {
  credit_card_id: string;
  current_amount: number;
  total_used: number;
  limit_amount: number;
  available_limit: number;
  usage_percentage: number;
  closing_date: Date;
  due_date: Date;
  transactions_count: number;
}

// Validation types
export interface CreditCardValidation {
  isValid: boolean;
  errors: {
    bank_id?: string;
    limit_amount?: string;
    description?: string;
    brand?: string;
    closing_day?: string;
    due_day?: string;
    due_after_closing?: string;
    last_four_digits?: string;
  };
}

// Filter types for credit card list
export interface CreditCardFilters {
  bank_id?: string;
  brand?: CreditCardBrand;
  is_archived?: boolean;
  search?: string;
}
