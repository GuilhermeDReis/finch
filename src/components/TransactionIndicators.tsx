
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

  // Enhanced AI confidence color logic
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 border-green-200';
    if (confidence >= 0.5) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'Alta';
    if (confidence >= 0.5) return 'Média';
    return 'Baixa';
  };

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

        {/* Badge de Confiança da IA */}
        {transaction.aiSuggestion && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className={`text-xs border ${
                  transaction.aiSuggestion.usedFallback
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : getConfidenceColor(transaction.aiSuggestion.confidence)
                } w-fit`}
              >
                {transaction.aiSuggestion.usedFallback ? '⚠️ Fallback' : `🤖 ${getConfidenceLabel(transaction.aiSuggestion.confidence)} (${Math.round(transaction.aiSuggestion.confidence * 100)}%)`}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="space-y-2">
                <p className="font-medium">
                  {transaction.aiSuggestion.usedFallback ? 'Sistema de fallback usado' : `Confiança: ${getConfidenceLabel(transaction.aiSuggestion.confidence)}`}
                </p>
                <p className="text-sm">{transaction.aiSuggestion.reasoning}</p>
                {transaction.aiSuggestion.usedFallback && (
                  <p className="text-xs text-muted-foreground">
                    IA temporariamente indisponível
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
