
import React from 'react';
import { TableRow, TableCell } from './ui/table';
import { Badge } from './ui/badge';
import { RefreshCw, CreditCard, AlertCircle } from 'lucide-react';
import type { RefundedTransaction, UnifiedPixTransaction } from '@/types/transaction';

interface GroupedTransactionRowProps {
  transaction: RefundedTransaction | UnifiedPixTransaction;
  formatCurrency: (amount: number) => string;
  formatDate: (dateStr: string) => string;
}

export default function GroupedTransactionRow({ 
  transaction, 
  formatCurrency, 
  formatDate 
}: GroupedTransactionRowProps) {
  const isRefund = transaction.status === 'refunded';
  const isUnifiedPix = transaction.status === 'unified-pix';

  const getDisplayInfo = () => {
    if (isRefund) {
      const refund = transaction as RefundedTransaction;
      return {
        date: refund.originalTransaction.date,
        amount: refund.originalTransaction.amount,
        description: `${refund.originalTransaction.description} (Estornado)`,
        icon: <RefreshCw className="h-4 w-4" />,
        badgeText: 'Estorno',
        badgeVariant: 'secondary' as const
      };
    } else {
      const unified = transaction as UnifiedPixTransaction;
      return {
        date: unified.pixTransaction.date,
        amount: unified.pixTransaction.amount,
        description: `PIX (via Crédito): ${unified.pixTransaction.description}`,
        icon: <CreditCard className="h-4 w-4" />,
        badgeText: 'PIX Unificado',
        badgeVariant: 'outline' as const
      };
    }
  };

  const displayInfo = getDisplayInfo();

  return (
    <TableRow className="bg-gray-100 text-gray-600">
      <TableCell>
        {/* Empty checkbox cell */}
      </TableCell>
      
      <TableCell className="font-mono text-sm">
        {formatDate(displayInfo.date)}
      </TableCell>
      
      <TableCell>
        <span className={`font-semibold ${isRefund ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
          {formatCurrency(displayInfo.amount)}
        </span>
      </TableCell>
      
      <TableCell>
        <div className="flex items-center gap-2">
          {displayInfo.icon}
          <span className="max-w-xs truncate">
            {displayInfo.description}
          </span>
        </div>
      </TableCell>

      <TableCell>
        <Badge variant={displayInfo.badgeVariant} className="flex items-center gap-1 text-xs px-2 py-1">
          <AlertCircle className="h-3 w-3" />
          {displayInfo.badgeText}
        </Badge>
      </TableCell>
      
      <TableCell className="text-gray-400">
        —
      </TableCell>
      
      <TableCell className="text-gray-400">
        —
      </TableCell>
      
      <TableCell className="text-gray-400">
        —
      </TableCell>
    </TableRow>
  );
}
