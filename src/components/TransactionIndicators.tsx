
import React from 'react';
import { Badge } from './ui/badge';
import { CreditCard, Smartphone, Banknote, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import type { TransactionRow } from '@/types/transaction';

interface TransactionIndicatorsProps {
  transaction: TransactionRow;
}

export default function TransactionIndicators({ transaction }: TransactionIndicatorsProps) {
  // Detectar método de pagamento na descrição
  const getPaymentMethod = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('pix')) return { type: 'PIX', icon: Smartphone, color: 'bg-blue-500' };
    if (desc.includes('crédito') || desc.includes('credito')) return { type: 'Crédito', icon: CreditCard, color: 'bg-purple-500' };
    if (desc.includes('débito') || desc.includes('debito')) return { type: 'Débito', icon: CreditCard, color: 'bg-green-500' };
    if (desc.includes('dinheiro') || desc.includes('espécie')) return { type: 'Dinheiro', icon: Banknote, color: 'bg-amber-500' };
    return { type: 'Outros', icon: HelpCircle, color: 'bg-gray-500' };
  };

  const paymentMethod = getPaymentMethod(transaction.description);
  const PaymentIcon = paymentMethod.icon;

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-1.5 min-w-[120px]">
        {/* Badge do Método de Pagamento */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="secondary" 
              className={`flex items-center gap-1 text-xs font-medium ${paymentMethod.color} text-white border-0 w-fit`}
            >
              <PaymentIcon className="h-3 w-3" />
              {paymentMethod.type}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Método de pagamento detectado na descrição</p>
          </TooltipContent>
        </Tooltip>

        {/* Badges da IA (se houver sugestão) - apenas confiança */}
        {transaction.aiSuggestion && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="secondary" 
                className={`text-xs border ${
                  transaction.aiSuggestion.usedFallback
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : transaction.aiSuggestion.confidence >= 0.8 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : transaction.aiSuggestion.confidence >= 0.5 
                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                } w-fit`}
              >
                {transaction.aiSuggestion.usedFallback ? '⚠️' : '🤖'} {Math.round(transaction.aiSuggestion.confidence * 100)}%
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{transaction.aiSuggestion.reasoning}</p>
              {transaction.aiSuggestion.usedFallback && (
                <p className="text-xs mt-1 text-muted-foreground">
                  Sistema de fallback usado devido à sobrecarga da IA
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
