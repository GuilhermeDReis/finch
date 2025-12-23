import { z } from 'zod';
import type { TransactionRow } from '@/types/transaction';
import type { ExistingTransaction } from '@/services/duplicateDetection';

// Enum para passos de importação padronizados
export enum ImportStep {
  UPLOAD = 'upload',
  IDENTIFICATION = 'identification',
  DUPLICATE_ANALYSIS = 'duplicate-analysis', 
  PROCESSING = 'processing',
  CATEGORIZATION = 'categorization',
  COMPLETION = 'completion',
  MANUAL_SELECTION = 'manual-selection'
}

// Enum para tipos de transação padronizados  
export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense'
}

// Enum para tipos de layout padronizados
export enum LayoutType {
  BANK = 'bank',
  CREDIT_CARD = 'credit_card'
}

// Enum para modos de importação padronizados
export enum ImportMode {
  NEW_ONLY = 'new-only',
  UPDATE_EXISTING = 'update-existing', 
  IMPORT_ALL = 'import-all'
}

// Interface central para transação parseada
export interface ParsedTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  originalDescription: string;
  type: TransactionType;
}

// Interface para sessão de importação
export interface ImportSession {
  id: string;
  filename: string;
  total_records: number;
  processed_records?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

// Interface para análise de duplicatas
export interface DuplicateAnalysis {
  duplicates: Array<{
    existing: ExistingTransaction;
    new: TransactionRow;
    similarity: number;
    reasons: string[];
  }>;
  newTransactions: TransactionRow[];
}

// Interface para resultados de importação
export interface ImportResults {
  successful: number;
  failed: number;
  skipped: number;
  updated: number;
  total: number;
  errors: string[];
}

// Interface para estado de processamento
export interface ProcessingState {
  setIsProcessing: (processing: boolean) => void;
  setProcessingProgress: (progress: number) => void;
  setCurrentProcessingMessage: (message: string) => void;
  setCurrentProcessingSubMessage: (message: string) => void;
}

// Schemas Zod para validação
export const ParsedTransactionSchema = z.object({
  id: z.string().min(1, 'ID é obrigatório'),
  date: z.string().refine(
    (date) => !isNaN(Date.parse(date)), 
    'Data inválida'
  ),
  amount: z.number().finite('Valor deve ser um número válido'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  originalDescription: z.string().min(1, 'Descrição original é obrigatória'),
  type: z.nativeEnum(TransactionType, {
    errorMap: () => ({ message: 'Tipo deve ser income ou expense' })
  })
});

export const ImportSessionSchema = z.object({
  id: z.string().uuid('ID da sessão deve ser um UUID válido'),
  filename: z.string().min(1, 'Nome do arquivo é obrigatório'),
  total_records: z.number().int().min(0, 'Total de registros deve ser um número inteiro positivo'),
  processed_records: z.number().int().min(0).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed'], {
    errorMap: () => ({ message: 'Status deve ser pending, processing, completed ou failed' })
  }),
  error_message: z.string().optional(),
  created_at: z.string().min(1, 'Data de criação é obrigatória'),
  completed_at: z.string().optional()
});

// Tipos derivados dos schemas
export type ParsedTransactionData = z.infer<typeof ParsedTransactionSchema>;
export type ImportSessionData = z.infer<typeof ImportSessionSchema>;

// Helpers de validação
export const validateParsedTransaction = (data: unknown): ParsedTransactionData => {
  return ParsedTransactionSchema.parse(data);
};

export const validateImportSession = (data: unknown): ImportSessionData => {
  return ImportSessionSchema.parse(data);
};

// Utility functions
export const isValidUUID = (str: string | undefined | null): boolean => {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Detectar tipo de transação de cartão de crédito unificado
export const detectCreditCardTransactionType = (amount: number, description: string): TransactionType => {
  // Para cartões de crédito, identificar receitas por padrões específicos
  const incomePatterns = [
    /estorno/i,
    /credito/i,
    /crédito/i,
    /devolucao/i,
    /devolução/i,
    /reembolso/i,
    /cashback/i,
    /bonus/i,
    /bônus/i
  ];

  const lowerDescription = description.toLowerCase();
  const hasIncomePattern = incomePatterns.some(pattern => pattern.test(lowerDescription));
  
  // Se tem padrão de receita ou valor positivo com padrão específico
  if (hasIncomePattern || (amount > 0 && hasIncomePattern)) {
    return TransactionType.INCOME;
  }
  
  // Por padrão, transações de cartão são despesas
  return TransactionType.EXPENSE;
};