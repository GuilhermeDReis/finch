
import React from 'react';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import type { TransactionRow } from '@/types/transaction';

interface TransactionIndicatorsProps {
  transaction: TransactionRow;
}

export default function TransactionIndicators({ transaction }: TransactionIndicatorsProps) {
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
        {/* Badge de Confiança da IA - apenas se há categoria definida */}
        {transaction.aiSuggestion && transaction.categoryId && (
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
