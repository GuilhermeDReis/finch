import React from 'react';
import { CreditCard } from '@/types/creditCard';
import ImportCreditCardCard from '@/components/ImportCreditCardCard';

interface CreditCardGridSelectorProps {
  creditCards: CreditCard[];
  selectedCreditCardId?: string;
  onSelect: (cardId: string) => void;
  loading?: boolean;
}

export function CreditCardGridSelector({ 
  creditCards, 
  selectedCreditCardId, 
  onSelect, 
  loading = false 
}: CreditCardGridSelectorProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-muted-foreground">Carregando cartões...</div>
      </div>
    );
  }

  if (creditCards.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum cartão de crédito encontrado para o banco selecionado.</p>
        <p className="text-sm mt-2">Verifique se você possui cartões cadastrados para este banco.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {creditCards.map((card) => (
        <ImportCreditCardCard
          key={card.id}
          card={card}
          isSelected={selectedCreditCardId === card.id}
          onClick={() => onSelect(card.id)}
        />
      ))}
    </div>
  );
}