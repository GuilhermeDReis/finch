import type { TransactionRow } from '@/types/transaction';

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
  refundedTransactions: any[];
  unifiedPixTransactions: any[];
}

export interface SimplifiedDetectionResult {
  newTransactions: TransactionRow[];
  duplicates: Array<{
    existing: any;
    new: TransactionRow;
    similarity: number;
    reasons: string[];
  }>;
  hiddenTransactionIds: Set<string>;
  refundPairs: Array<{
    id: string;
    originalTransaction: TransactionRow;
    refundTransaction: TransactionRow;
  }>;
  pixPairs: Array<{
    id: string;
    pixTransaction: TransactionRow;
    creditTransaction: TransactionRow;
  }>;
}

export function detectDuplicates(
  newTransactions: TransactionRow[],
  existingTransactions: any[]
): SimplifiedDetectionResult {
  console.log('🔍 [DUPLICATE] Starting simplified duplicate detection:', {
    newTransactions: newTransactions.length,
    existingTransactions: existingTransactions.length
  });

  const duplicates: SimplifiedDetectionResult['duplicates'] = [];
  const refundPairs: SimplifiedDetectionResult['refundPairs'] = [];
  const pixPairs: SimplifiedDetectionResult['pixPairs'] = [];
  const hiddenTransactionIds = new Set<string>();
  
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
          
          refundPairs.push({
            id: `refund-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            originalTransaction,
            refundTransaction
          });
          
          // Mark both transactions as hidden
          hiddenTransactionIds.add(originalTransaction.id);
          hiddenTransactionIds.add(refundTransaction.id);
        }
      }
    }
  });

  // Step 3: Detect unified PIX transactions (PIX + Credit card pairs)
  // Only consider transactions that haven't been processed as refunds
  const unprocessedTransactions = newTransactions.filter(t => 
    !hiddenTransactionIds.has(t.id)
  );

  const pixTransactions = unprocessedTransactions.filter(t => 
    t.description.toLowerCase().includes('pix') && t.type === 'expense'
  );

  const creditTransactions = unprocessedTransactions.filter(t => 
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
      
      return amountMatch && dateMatch && !hiddenTransactionIds.has(creditTx.id);
    });

    if (matchingCredit) {
      console.log('🔗 [PIX] Unified PIX transaction found:', {
        pixId: pixTx.id,
        pixDesc: pixTx.description,
        creditId: matchingCredit.id,
        creditDesc: matchingCredit.description,
        amount: pixTx.amount
      });
      
      pixPairs.push({
        id: `pix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        pixTransaction: pixTx,
        creditTransaction: matchingCredit
      });
      
      // Mark both transactions as hidden
      hiddenTransactionIds.add(pixTx.id);
      hiddenTransactionIds.add(matchingCredit.id);
    }
  });

  // Step 4: Check remaining transactions for duplicates with existing data
  const remainingTransactions = newTransactions.filter(t => !hiddenTransactionIds.has(t.id));
  
  console.log('🔍 [DUPLICATE] Checking remaining transactions for duplicates:', {
    remaining: remainingTransactions.length,
    hidden: hiddenTransactionIds.size
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
    hiddenTransactionIds,
    refundPairs,
    pixPairs
  };

  console.log('✅ [DUPLICATE] Detection completed:', {
    duplicates: result.duplicates.length,
    newTransactions: result.newTransactions.length,
    refundPairs: result.refundPairs.length,
    pixPairs: result.pixPairs.length,
    totalHidden: result.hiddenTransactionIds.size
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