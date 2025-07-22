
import type { TransactionRow } from '@/types/transaction';

// Generate a truly unique ID using multiple entropy sources
export const generateUniqueId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for environments without crypto.randomUUID
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const performanceNow = performance.now().toString(36).replace('.', '');
  
  return `${timestamp}-${randomPart}-${performanceNow}`;
};

// Validate and fix duplicate IDs in transaction array
export const validateAndFixDuplicateIds = (transactions: TransactionRow[]): {
  transactions: TransactionRow[];
  hadDuplicates: boolean;
  duplicateReport: Array<{ originalId: string; newId: string; description: string }>;
} => {
  const idMap = new Map<string, number>();
  const duplicateReport: Array<{ originalId: string; newId: string; description: string }> = [];
  let hadDuplicates = false;

  // First pass: identify duplicates
  transactions.forEach((transaction, index) => {
    const count = idMap.get(transaction.id) || 0;
    idMap.set(transaction.id, count + 1);
  });

  // Second pass: fix duplicates
  const fixedTransactions = transactions.map((transaction, index) => {
    const duplicateCount = idMap.get(transaction.id) || 0;
    
    if (duplicateCount > 1) {
      hadDuplicates = true;
      const newId = generateUniqueId();
      
      console.warn('🔧 [ID_VALIDATION] Found duplicate ID, generating new one:', {
        originalId: transaction.id,
        newId,
        description: transaction.description,
        index,
        duplicateCount
      });
      
      duplicateReport.push({
        originalId: transaction.id,
        newId,
        description: transaction.description
      });
      
      return {
        ...transaction,
        id: newId
      };
    }
    
    return transaction;
  });

  if (hadDuplicates) {
    console.warn('🚨 [ID_VALIDATION] Duplicate IDs detected and fixed:', {
      totalTransactions: transactions.length,
      duplicatesFixed: duplicateReport.length,
      duplicateReport
    });
  } else {
    console.log('✅ [ID_VALIDATION] All transaction IDs are unique');
  }

  return {
    transactions: fixedTransactions,
    hadDuplicates,
    duplicateReport
  };
};

// Create completely isolated transaction copy
export const createIsolatedTransaction = <T>(transaction: T): T => {
  if (transaction === null || typeof transaction !== 'object') {
    return transaction;
  }

  // Use structuredClone if available (modern browsers)
  if (typeof structuredClone !== 'undefined') {
    try {
      return structuredClone(transaction);
    } catch (error) {
      console.warn('⚠️ [ISOLATION] structuredClone failed, using fallback:', error);
    }
  }

  // Fallback deep clone implementation
  if (transaction instanceof Date) {
    return new Date(transaction.getTime()) as unknown as T;
  }

  if (Array.isArray(transaction)) {
    return transaction.map(item => createIsolatedTransaction(item)) as unknown as T;
  }

  const isolated = {} as T;
  for (const key in transaction) {
    if (Object.prototype.hasOwnProperty.call(transaction, key)) {
      isolated[key] = createIsolatedTransaction(transaction[key]);
    }
  }

  return isolated;
};

// Verify transaction integrity after updates
export const verifyTransactionIntegrity = (
  beforeState: TransactionRow[],
  afterState: TransactionRow[],
  targetId: string,
  operation: string
): boolean => {
  if (beforeState.length !== afterState.length) {
    console.error('🚨 [INTEGRITY] Transaction count mismatch:', {
      before: beforeState.length,
      after: afterState.length,
      targetId,
      operation
    });
    return false;
  }

  let unintendedChanges = 0;
  let targetFound = false;

  for (let i = 0; i < beforeState.length; i++) {
    const before = beforeState[i];
    const after = afterState[i];

    if (before.id === targetId) {
      targetFound = true;
      continue; // Skip validation for target transaction
    }

    // Check if non-target transaction was changed
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      unintendedChanges++;
      console.error('🚨 [INTEGRITY] Unintended change detected:', {
        transactionId: before.id,
        description: before.description,
        targetId,
        operation,
        before: {
          categoryId: before.categoryId,
          subcategoryId: before.subcategoryId,
          description: before.description
        },
        after: {
          categoryId: after.categoryId,
          subcategoryId: after.subcategoryId,
          description: after.description
        }
      });
    }
  }

  if (!targetFound) {
    console.error('🚨 [INTEGRITY] Target transaction not found:', { targetId, operation });
    return false;
  }

  if (unintendedChanges > 0) {
    console.error('🚨 [INTEGRITY] Integrity violation detected:', {
      unintendedChanges,
      targetId,
      operation,
      totalTransactions: beforeState.length
    });
    return false;
  }

  console.log('✅ [INTEGRITY] Transaction integrity verified:', {
    targetId,
    operation,
    totalTransactions: beforeState.length
  });

  return true;
};

// Generate stable, unique key for React components
export const generateStableKey = (transaction: TransactionRow, prefix: string = ''): string => {
  const baseKey = `${prefix}${transaction.id}`;
  const contentHash = `${transaction.categoryId || 'none'}-${transaction.subcategoryId || 'none'}`;
  return `${baseKey}-${contentHash}`;
};

// Deep compare two objects for debugging
export const deepCompare = (obj1: any, obj2: any, path: string = 'root'): boolean => {
  if (obj1 === obj2) return true;
  
  if (obj1 === null || obj2 === null) return false;
  if (typeof obj1 !== typeof obj2) return false;
  
  if (typeof obj1 === 'object') {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!deepCompare(obj1[key], obj2[key], `${path}.${key}`)) return false;
    }
    
    return true;
  }
  
  return false;
};
