
import { useEffect, useRef } from 'react';
import type { TransactionRow } from '@/types/transaction';
import { deepCompare } from '@/utils/transactionIntegrity';

interface IntegritySnapshot {
  timestamp: number;
  transactions: TransactionRow[];
  operation?: string;
}

export const useTransactionIntegrity = (
  transactions: TransactionRow[],
  enabled: boolean = true
) => {
  const snapshotRef = useRef<IntegritySnapshot | null>(null);
  const operationRef = useRef<string>('');

  useEffect(() => {
    if (!enabled || transactions.length === 0) return;

    const currentSnapshot: IntegritySnapshot = {
      timestamp: Date.now(),
      transactions: transactions.map(t => ({ ...t })), // Shallow copy for comparison
      operation: operationRef.current
    };

    if (snapshotRef.current) {
      const previous = snapshotRef.current;
      
      // Check for unexpected changes
      if (previous.transactions.length === transactions.length) {
        let changedCount = 0;
        const changes: Array<{ id: string; description: string }> = [];

        for (let i = 0; i < transactions.length; i++) {
          const prev = previous.transactions[i];
          const curr = transactions[i];

          if (prev.id === curr.id && !deepCompare(prev, curr)) {
            changedCount++;
            changes.push({
              id: curr.id,
              description: curr.description
            });
          }
        }

        if (changedCount > 1) {
          console.warn('🚨 [INTEGRITY_MONITOR] Multiple transactions changed simultaneously:', {
            changedCount,
            changes,
            previousOperation: previous.operation,
            timeDiff: currentSnapshot.timestamp - previous.timestamp,
            totalTransactions: transactions.length
          });
        }
      }
    }

    snapshotRef.current = currentSnapshot;
    operationRef.current = ''; // Reset operation after snapshot
  }, [transactions, enabled]);

  const setOperation = (operation: string) => {
    operationRef.current = operation;
  };

  return { setOperation };
};
