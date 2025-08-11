import { Plus } from 'lucide-react';
import { CreditCardWithBank } from '@/types/creditCard';
import { CreditCardCard } from '@/components/CreditCardCard';

interface CreditCardGridProps {
  creditCards: CreditCardWithBank[];
  onEdit: (card: CreditCardWithBank) => void;
  onArchive: (cardId: string) => void;
  onAddNew: () => void;
}

export function CreditCardGrid({ creditCards, onAddNew, onEdit }: CreditCardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {/* Existing Credit Cards */}
      {creditCards.map((card) => (
        <CreditCardCard
          key={card.id}
          creditCard={card}
          onEdit={() => onEdit(card)}
        />
      ))}
      
      {/* Add New Card Button - Just the circular button */}
      <div className="w-[290px] h-[176px] flex items-center justify-center">
        <button
          onClick={onAddNew}
          className="group w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
        >
          <Plus className="h-8 w-8 text-white transition-transform duration-200 group-hover:scale-110" />
        </button>
      </div>
    </div>
  );
}
