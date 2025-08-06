import { Plus } from 'lucide-react';
import { CreditCardWithBank } from '@/types/creditCard';
import { CreditCardCard } from '@/components/CreditCardCard';

interface CreditCardGridProps {
  creditCards: CreditCardWithBank[];
  onEdit: (card: CreditCardWithBank) => void;
  onArchive: (cardId: string) => void;
  onAddNew: () => void;
}

export function CreditCardGrid({ creditCards, onEdit, onArchive, onAddNew }: CreditCardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <div 
        onClick={onAddNew} 
        className="relative w-60 h-40 rounded-lg cursor-pointer transition-all duration-300 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 flex flex-col justify-center items-center p-5"
      >
        <Plus className="h-10 w-10 text-muted-foreground/60 mb-4" />
        <p className="text-base font-semibold text-muted-foreground mb-2">Adicionar Cartão</p>
        <p className="text-sm text-muted-foreground/70 text-center">Novo cartão de crédito</p>
      </div>
      {creditCards.map((card) => (
        <CreditCardCard
          key={card.id}
          creditCard={card}
          onEdit={() => onEdit(card)}
          onArchive={() => onArchive(card.id)}
        />
      ))}
    </div>
  );
}
