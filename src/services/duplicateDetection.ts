
import type { TransactionRow, RefundedTransaction, UnifiedPixTransaction } from '@/types/transaction';

export interface DuplicateAnalysis {
  totalNew: number;
  totalDuplicates: number;
  duplicates: Array<{
    existing: any;
    new: TransactionRow;
    similarity: number;
    reasons: string[];
  }>;
  newTransactions: TransactionRow[];
  refundedTransactions: RefundedTransaction[];
  unifiedPixTransactions: UnifiedPixTransaction[];
}

export interface DuplicateDetectionResult {
  duplicates: Array<{
    existing: any;
    new: TransactionRow;
    similarity: number;
    reasons: string[];
  }>;
  newTransactions: TransactionRow[];
  refundedTransactions: RefundedTransaction[];
  unifiedPixTransactions: UnifiedPixTransaction[];
}

export function detectDuplicates(
  newTransactions: TransactionRow[],
  existingTransactions: any[]
): DuplicateDetectionResult {
  console.log('🔍 [DUPLICATE] Starting duplicate detection:', {
    newTransactions: newTransactions.length,
    existingTransactions: existingTransactions.length
  });

  const duplicates: DuplicateDetectionResult['duplicates'] = [];
  const refundedTransactions: RefundedTransaction[] = [];
  const unifiedPixTransactions: UnifiedPixTransaction[] = [];
  const processedTransactionIds = new Set<string>();
  
  // Debug: Log all new transactions to understand the data
  console.log('📋 [DUPLICATE] New transactions sample:', 
    newTransactions.slice(0, 3).map(t => ({
      id: t.id,
      description: t.description,
      amount: t.amount,
      date: t.date
    }))
  );

  // Step 1: Group transactions by external ID for refund detection
  const groupedById = new Map<string, TransactionRow[]>();
  
  newTransactions.forEach(transaction => {
    const id = transaction.id;
    if (!groupedById.has(id)) {
      groupedById.set(id, []);
    }
    groupedById.get(id)!.push(transaction);
  });

  console.log('📊 [DUPLICATE] Grouped transactions by ID:', {
    totalGroups: groupedById.size,
    groupsWithMultiple: Array.from(groupedById.entries()).filter(([_, txns]) => txns.length > 1).length
  });

  // Step 2: Detect refunds (transactions with same ID, one containing "estorno")
  groupedById.forEach((transactions, id) => {
    if (transactions.length === 2) {
      const hasEstorno = transactions.some(t => 
        t.description.toLowerCase().includes('estorno')
      );
      
      if (hasEstorno) {
        const originalTransaction = transactions.find(t => 
          !t.description.toLowerCase().includes('estorno')
        );
        const refundTransaction = transactions.find(t => 
          t.description.toLowerCase().includes('estorno')
        );
        
        if (originalTransaction && refundTransaction) {
          console.log('🔄 [REFUND] Detected refund pair:', {
            originalId: originalTransaction.id,
            originalDesc: originalTransaction.description,
            refundId: refundTransaction.id,
            refundDesc: refundTransaction.description
          });
          
          refundedTransactions.push({
            id: `refund-${id}`,
            originalTransaction: {
              ...originalTransaction,
              status: 'refunded'
            },
            refundTransaction: {
              ...refundTransaction,
              status: 'hidden'
            },
            status: 'refunded'
          });
          
          // Mark both transactions as processed
          processedTransactionIds.add(originalTransaction.id);
          processedTransactionIds.add(refundTransaction.id);
        }
      }
    } else if (transactions.length > 2) {
      console.warn('⚠️ [DUPLICATE] More than 2 transactions with same ID:', {
        id,
        count: transactions.length,
        descriptions: transactions.map(t => t.description)
      });
    }
  });

  // Step 3: Detect unified PIX transactions (PIX + Credit card pairs)
  const pixTransactions = newTransactions.filter(t => 
    !processedTransactionIds.has(t.id) && 
    t.description.toLowerCase().includes('pix') &&
    t.type === 'expense'
  );

  const creditTransactions = newTransactions.filter(t => 
    !processedTransactionIds.has(t.id) && 
    (t.description.toLowerCase().includes('crédito') || t.description.toLowerCase().includes('credito')) &&
    t.type === 'expense'
  );

  console.log('💳 [PIX] Found PIX and credit transactions:', {
    pixCount: pixTransactions.length,
    creditCount: creditTransactions.length
  });

  // Match PIX with credit transactions by amount and date proximity
  pixTransactions.forEach(pixTx => {
    const matchingCredit = creditTransactions.find(creditTx => {
      const amountMatch = Math.abs(pixTx.amount - creditTx.amount) < 0.01;
      const dateMatch = Math.abs(
        new Date(pixTx.date).getTime() - new Date(creditTx.date).getTime()
      ) < 24 * 60 * 60 * 1000; // Within 24 hours
      
      return amountMatch && dateMatch && !processedTransactionIds.has(creditTx.id);
    });

    if (matchingCredit) {
      console.log('🔗 [PIX] Unified PIX transaction found:', {
        pixId: pixTx.id,
        pixDesc: pixTx.description,
        creditId: matchingCredit.id,
        creditDesc: matchingCredit.description,
        amount: pixTx.amount
      });
      
      unifiedPixTransactions.push({
        id: `unified-pix-${pixTx.id}`,
        creditTransaction: {
          ...matchingCredit,
          status: 'hidden'
        },
        pixTransaction: {
          ...pixTx,
          status: 'unified-pix',
          description: `PIX via Crédito: ${pixTx.description}`
        },
        status: 'unified-pix'
      });
      
      processedTransactionIds.add(pixTx.id);
      processedTransactionIds.add(matchingCredit.id);
    }
  });

  // Step 4: Check remaining transactions for duplicates with existing data
  const remainingTransactions = newTransactions.filter(t => !processedTransactionIds.has(t.id));
  
  console.log('🔍 [DUPLICATE] Checking remaining transactions for duplicates:', {
    remaining: remainingTransactions.length,
    processed: processedTransactionIds.size
  });

  remainingTransactions.forEach(newTx => {
    const potentialDuplicates = existingTransactions.filter(existing => {
      const amountMatch = Math.abs(parseFloat(existing.amount) - newTx.amount) < 0.01;
      const dateMatch = existing.date === newTx.date;
      const descriptionSimilarity = calculateSimilarity(existing.description, newTx.description);
      
      return amountMatch && dateMatch && descriptionSimilarity > 0.8;
    });

    if (potentialDuplicates.length > 0) {
      const bestMatch = potentialDuplicates[0];
      duplicates.push({
        existing: bestMatch,
        new: newTx,
        similarity: calculateSimilarity(bestMatch.description, newTx.description),
        reasons: ['Mesmo valor', 'Mesma data', 'Descrição similar']
      });
      
      console.log('⚠️ [DUPLICATE] Found duplicate:', {
        newId: newTx.id,
        newDesc: newTx.description,
        existingId: bestMatch.id,
        existingDesc: bestMatch.description
      });
    }
  });

  // Step 5: Prepare final results
  const finalDuplicateIds = new Set(duplicates.map(d => d.new.id));
  const newTransactionsFiltered = remainingTransactions.filter(t => !finalDuplicateIds.has(t.id));

  const result = {
    duplicates,
    newTransactions: newTransactionsFiltered,
    refundedTransactions,
    unifiedPixTransactions
  };

  console.log('✅ [DUPLICATE] Detection completed:', {
    duplicates: result.duplicates.length,
    newTransactions: result.newTransactions.length,
    refundedTransactions: result.refundedTransactions.length,
    unifiedPixTransactions: result.unifiedPixTransactions.length
  });

  return result;
}

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}
