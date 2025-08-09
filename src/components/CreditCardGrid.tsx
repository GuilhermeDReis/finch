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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {/* Add New Card Button */}
      <div 
        className="group relative bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 min-h-[200px]"
        onClick={onAddNew}
      >
        <div className="p-3 bg-white rounded-full shadow-sm group-hover:shadow-md transition-shadow duration-200 mb-4">
          <Plus className="h-8 w-8 text-gray-400 group-hover:text-blue-600 transition-colors duration-200" />
        </div>
        <span className="text-gray-600 font-medium group-hover:text-blue-700 transition-colors duration-200">
          Adicionar Cartão
        </span>
        <span className="text-sm text-gray-400 mt-1 group-hover:text-blue-500 transition-colors duration-200">
          Clique para cadastrar
        </span>
      </div>

      {/* Credit Cards */}
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
