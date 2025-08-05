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
        className="relative w-60 h-36 rounded-lg cursor-pointer transition-all duration-300 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 hover:shadow-md hover:-translate-y-1 flex flex-col justify-center items-center"
      >
        <Plus className="h-8 w-8 text-muted-foreground/60 mb-4" />
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
