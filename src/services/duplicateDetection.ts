import { supabase } from '@/integrations/supabase/client';
import type { TransactionRow, RefundedTransaction, UnifiedPixTransaction } from '@/types/transaction';

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
  refundedTransactions: RefundedTransaction[];
  unifiedPixTransactions: UnifiedPixTransaction[];
  totalNew: number;
  totalDuplicates: number;
  totalRefunded: number;
  totalUnifiedPix: number;
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

// Helper function to find PIX category
const findPixCategory = async (): Promise<string | null> => {
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('type', 'expense')
    .or('name.ilike.%pix%,name.ilike.%transferência%');
  
  // Look for PIX category first, then Transferência
  const pixCategory = categories?.find(c => c.name.toLowerCase().includes('pix'));
  if (pixCategory) return pixCategory.id;
  
  const transferCategory = categories?.find(c => c.name.toLowerCase().includes('transferência'));
  if (transferCategory) return transferCategory.id;
  
  return null;
};

// Detect refunded transactions (same external_id with "Estorno" in description)
export const detectRefundedTransactions = (transactions: TransactionRow[]): RefundedTransaction[] => {
  const refundedTransactions: RefundedTransaction[] = [];
  const transactionMap = new Map<string, TransactionRow[]>();

  // Group transactions by external_id
  transactions.forEach(transaction => {
    const existing = transactionMap.get(transaction.id) || [];
    existing.push(transaction);
    transactionMap.set(transaction.id, existing);
  });

  // Find refund pairs
  transactionMap.forEach((transactionGroup, externalId) => {
    if (transactionGroup.length === 2) {
      const refundTransaction = transactionGroup.find(t => 
        t.description.toLowerCase().includes('estorno')
      );
      const originalTransaction = transactionGroup.find(t => 
        !t.description.toLowerCase().includes('estorno')
      );

      if (refundTransaction && originalTransaction) {
        console.log(`🔄 [REFUND] Found refund pair for ID ${externalId}:`, {
          original: originalTransaction.description,
          refund: refundTransaction.description
        });

        refundedTransactions.push({
          id: `refund-${externalId}`,
          originalTransaction,
          refundTransaction,
          status: 'refunded'
        });
      }
    }
  });

  return refundedTransactions;
};

// Detect PIX via credit transactions (same external_id with "Valor adicionado para Pix no Crédito")
export const detectUnifiedPixTransactions = async (transactions: TransactionRow[]): Promise<UnifiedPixTransaction[]> => {
  const unifiedPixTransactions: UnifiedPixTransaction[] = [];
  const transactionMap = new Map<string, TransactionRow[]>();

  // Group transactions by external_id
  transactions.forEach(transaction => {
    const existing = transactionMap.get(transaction.id) || [];
    existing.push(transaction);
    transactionMap.set(transaction.id, existing);
  });

  // Find PIX category for auto-categorization
  const pixCategoryId = await findPixCategory();

  // Find PIX via credit pairs
  transactionMap.forEach((transactionGroup, externalId) => {
    if (transactionGroup.length === 2) {
      const pixCreditTransaction = transactionGroup.find(t => 
        t.description.toLowerCase().includes('valor adicionado para pix no crédito')
      );
      const pixTransaction = transactionGroup.find(t => 
        !t.description.toLowerCase().includes('valor adicionado para pix no crédito')
      );

      if (pixCreditTransaction && pixTransaction) {
        console.log(`💳 [PIX-CREDIT] Found PIX via credit pair for ID ${externalId}:`, {
          credit: pixCreditTransaction.description,
          pix: pixTransaction.description
        });

        unifiedPixTransactions.push({
          id: `pix-unified-${externalId}`,
          creditTransaction: pixCreditTransaction,
          pixTransaction,
          status: 'unified-pix',
          categoryId: pixCategoryId || undefined,
          type: 'expense'
        });
      }
    }
  });

  return unifiedPixTransactions;
};

export const analyzeDuplicates = async (
  transactions: TransactionRow[]
): Promise<DuplicateAnalysis> => {
  const duplicateResults = await checkForDuplicates(transactions);
  
  // Detect special transaction groups
  const refundedTransactions = detectRefundedTransactions(transactions);
  const unifiedPixTransactions = await detectUnifiedPixTransactions(transactions);

  // Create sets of transaction IDs that are part of special groups
  const refundedIds = new Set<string>();
  const unifiedPixIds = new Set<string>();

  refundedTransactions.forEach(refund => {
    refundedIds.add(refund.originalTransaction.id);
    refundedIds.add(refund.refundTransaction.id);
  });

  unifiedPixTransactions.forEach(unified => {
    unifiedPixIds.add(unified.creditTransaction.id);
    unifiedPixIds.add(unified.pixTransaction.id);
  });

  const newTransactions: TransactionRow[] = [];
  const duplicateTransactions: Array<TransactionRow & { duplicateInfo: DuplicateCheckResult }> = [];
  
  transactions.forEach(transaction => {
    // Skip transactions that are part of special groups
    if (refundedIds.has(transaction.id) || unifiedPixIds.has(transaction.id)) {
      return;
    }

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

  console.log(`📊 [DUPLICATE_ANALYSIS] Analysis complete:`, {
    total: transactions.length,
    new: newTransactions.length,
    duplicates: duplicateTransactions.length,
    refunded: refundedTransactions.length,
    unifiedPix: unifiedPixTransactions.length
  });

  return {
    newTransactions,
    duplicateTransactions,
    refundedTransactions,
    unifiedPixTransactions,
    totalNew: newTransactions.length,
    totalDuplicates: duplicateTransactions.length,
    totalRefunded: refundedTransactions.length,
    totalUnifiedPix: unifiedPixTransactions.length
  };
};
