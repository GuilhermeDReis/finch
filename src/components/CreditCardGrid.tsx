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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div 
        onClick={onAddNew} 
        className="cursor-pointer p-8 text-center border-2 border-muted-foreground/30 rounded-lg hover:border-primary hover:shadow-lg hover:bg-muted/20 transition-all duration-200 min-h-[300px] flex flex-col justify-center items-center"
      >
        <Plus className="h-12 w-12 text-muted-foreground/60 mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Adicionar Novo Cartão</p>
        <p className="text-xs text-muted-foreground/70 mt-2">Clique para cadastrar</p>
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
