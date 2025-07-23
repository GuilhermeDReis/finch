
import { supabase } from '@/integrations/supabase/client';
import type { TransactionRow } from '@/types/transaction';

export interface DuplicateCheckResult {
  isNew: boolean;
  isDuplicate: boolean;
  existingTransaction?: {
    id: string;
    date: string;
    amount: number;
    description: string;
    category_id?: string;
    subcategory_id?: string;
  };
}

export interface DuplicateAnalysis {
  newTransactions: TransactionRow[];
  duplicateTransactions: Array<TransactionRow & { duplicateInfo: DuplicateCheckResult }>;
  totalNew: number;
  totalDuplicates: number;
}

export const checkForDuplicates = async (
  transactions: TransactionRow[]
): Promise<Map<string, DuplicateCheckResult>> => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Usuário não autenticado');
  }

  // Extract external_ids from transactions
  const externalIds = transactions.map(t => t.id);
  
  if (externalIds.length === 0) {
    return new Map();
  }

  // Query existing transactions in batches
  const { data: existingTransactions, error } = await supabase
    .from('transactions')
    .select('external_id, id, date, amount, description, category_id, subcategory_id')
    .eq('user_id', user.id)
    .in('external_id', externalIds);

  if (error) {
    throw new Error(`Erro ao verificar duplicatas: ${error.message}`);
  }

  // Create map for quick lookup
  const existingMap = new Map<string, any>();
  existingTransactions?.forEach(transaction => {
    existingMap.set(transaction.external_id, transaction);
  });

  // Analyze each transaction
  const results = new Map<string, DuplicateCheckResult>();
  
  transactions.forEach(transaction => {
    const existing = existingMap.get(transaction.id);
    
    if (existing) {
      results.set(transaction.id, {
        isNew: false,
        isDuplicate: true,
        existingTransaction: existing
      });
    } else {
      results.set(transaction.id, {
        isNew: true,
        isDuplicate: false
      });
    }
  });

  return results;
};

export const analyzeDuplicates = async (
  transactions: TransactionRow[]
): Promise<DuplicateAnalysis> => {
  const duplicateResults = await checkForDuplicates(transactions);
  
  const newTransactions: TransactionRow[] = [];
  const duplicateTransactions: Array<TransactionRow & { duplicateInfo: DuplicateCheckResult }> = [];
  
  transactions.forEach(transaction => {
    const result = duplicateResults.get(transaction.id);
    
    if (result?.isNew) {
      newTransactions.push(transaction);
    } else if (result?.isDuplicate) {
      duplicateTransactions.push({
        ...transaction,
        duplicateInfo: result
      });
    }
  });

  return {
    newTransactions,
    duplicateTransactions,
    totalNew: newTransactions.length,
    totalDuplicates: duplicateTransactions.length
  };
};
