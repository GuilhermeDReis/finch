import React from 'react';
import { Badge } from './ui/badge';
import type { TransactionStatus } from '@/types/transaction';

interface UnifiedTransactionBadgeProps {
  status?: TransactionStatus;
}

const UnifiedTransactionBadge = React.memo(function UnifiedTransactionBadge({ status }: UnifiedTransactionBadgeProps) {
  if (!status || status === 'normal') {
    return null;
  }

  const getBadgeProps = (status: TransactionStatus) => {
    switch (status) {
      case 'refunded':
        return {
          variant: 'success' as const,
          children: 'Estorno'
        };
      case 'unified-pix':
        return {
          variant: 'default' as const,
          children: 'PIX Crédito'
        };
      case 'hidden':
        return {
          variant: 'secondary' as const,
          children: 'Oculto'
        };
      default:
        return null;
    }
  };

  const badgeProps = getBadgeProps(status);
  
  if (!badgeProps) {
    return null;
  }

  return <Badge variant={badgeProps.variant}>{badgeProps.children}</Badge>;
});

export default UnifiedTransactionBadge;