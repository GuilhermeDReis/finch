import { z } from 'zod';

// Schema base para transação parseada do CSV
export const ParsedTransactionSchema = z.object({
  id: z.string().min(1, 'ID é obrigatório'),
  date: z.string().refine(
    (date) => !isNaN(Date.parse(date)), 
    'Data inválida'
  ),
  amount: z.number().finite('Valor deve ser um número válido'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  originalDescription: z.string().min(1, 'Descrição original é obrigatória'),
  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: 'Tipo deve ser income ou expense' })
  })
});

// Schema para dados da sessão de import
export const ImportSessionPayloadSchema = z.object({
  filename: z.string().min(1),
  total_records: z.number().int().min(0),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  user_id: z.string().uuid('User ID deve ser um UUID válido')
});

// Schema para validação de entrada de transação para persistência
export const TransactionPersistenceSchema = z.object({
  date: z.string().min(1),
  amount: z.number().finite(),
  description: z.string().min(1),
  original_description: z.string().min(1),
  external_id: z.string().min(1),
  type: z.enum(['income', 'expense']),
  category_id: z.string().uuid().nullable(),
  subcategory_id: z.string().uuid().nullable(),
  bank_id: z.string().uuid(),
  import_session_id: z.string().uuid(),
  user_id: z.string().uuid()
});

// Schema para transação de cartão de crédito
export const CreditCardTransactionPersistenceSchema = z.object({
  date: z.string().min(1),
  amount: z.number().finite(),
  description: z.string().min(1),
  original_description: z.string().min(1),
  external_id: z.string().min(1),
  credit_card_id: z.string().uuid(),
  type: z.enum(['income', 'expense']),
  category_id: z.string().uuid().nullable(),
  subcategory_id: z.string().uuid().nullable(),
  bank_id: z.string().uuid(),
  import_session_id: z.string().uuid(),
  user_id: z.string().uuid()
});

// Schema para validação de headers CSV
export const CSVHeadersSchema = z.array(z.string().min(1)).min(1, 'CSV deve ter pelo menos um cabeçalho');

// Schema para layout de arquivo
export const FileLayoutSchema = z.object({
  id: z.string().uuid(),
  bank_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  date_column: z.string().min(1),
  amount_column: z.string().min(1),
  identifier_column: z.string().min(1),
  description_column: z.string().min(1),
  date_format: z.string().min(1),
  decimal_separator: z.string().min(1),
  thousands_separator: z.string().nullable(),
  encoding: z.string().min(1),
  delimiter: z.string().min(1),
  has_header: z.boolean(),
  sample_file: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  layout_type: z.enum(['bank', 'credit_card']).optional(),
  file_type: z.enum(['bank', 'credit_card']).optional(),
  header_pattern: z.array(z.string()).optional()
});

// Tipos derivados dos schemas
export type ParsedTransactionData = z.infer<typeof ParsedTransactionSchema>;
export type ImportSessionPayloadData = z.infer<typeof ImportSessionPayloadSchema>;
export type TransactionPersistenceData = z.infer<typeof TransactionPersistenceSchema>;
export type CreditCardTransactionPersistenceData = z.infer<typeof CreditCardTransactionPersistenceSchema>;
export type CSVHeadersData = z.infer<typeof CSVHeadersSchema>;
export type FileLayoutData = z.infer<typeof FileLayoutSchema>;

// Helpers de validação
export const validateParsedTransaction = (data: unknown): ParsedTransactionData => {
  return ParsedTransactionSchema.parse(data);
};

export const validateCSVHeaders = (headers: unknown): CSVHeadersData => {
  return CSVHeadersSchema.parse(headers);
};

export const validateTransactionForPersistence = (data: unknown): TransactionPersistenceData => {
  return TransactionPersistenceSchema.parse(data);
};

export const validateCreditCardTransactionForPersistence = (data: unknown): CreditCardTransactionPersistenceData => {
  return CreditCardTransactionPersistenceSchema.parse(data);
};