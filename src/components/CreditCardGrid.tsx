import { CreditCardWithBank } from '@/types/creditCard';
import { CreditCardCard } from '@/components/CreditCardCard';

interface CreditCardGridProps {
  creditCards: CreditCardWithBank[];
  onEdit: (card: CreditCardWithBank) => void;
  onArchive: (cardId: string) => void;
}

export function CreditCardGrid({ creditCards, onEdit, onArchive }: CreditCardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
