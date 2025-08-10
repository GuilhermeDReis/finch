import { Plus } from 'lucide-react';
import { CreditCardWithBank } from '@/types/creditCard';
import { CreditCardCard } from '@/components/CreditCardCard';

interface CreditCardGridProps {
  creditCards: CreditCardWithBank[];
  onEditCard: (card: CreditCardWithBank) => void;
  onAddCard: () => void;
}

export function CreditCardGrid({ creditCards, onAddCard, onEditCard }: CreditCardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {/* Add New Card Button */}
      <button
        onClick={onAddCard}
        className="group relative w-[290px] h-[176px] rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-colors duration-200 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex flex-col items-center justify-center space-y-3"
      >
        <div className="p-3 bg-white dark:bg-gray-700 rounded-full shadow-sm group-hover:shadow-md transition-shadow duration-200">
          <Plus className="h-6 w-6 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors duration-200" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
            Adicionar Cartão
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors duration-200">
            Clique para criar um novo cartão
          </p>
        </div>
      </button>

      {/* Credit Cards */}
      {creditCards.map((card) => (
        <CreditCardCard
          key={card.id}
          creditCard={card}
          onEdit={() => onEditCard(card)}
        />
      ))}
    </div>
  );
}
