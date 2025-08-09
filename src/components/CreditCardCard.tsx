import { useNavigate } from 'react-router-dom';
import { CreditCardWithBank } from '@/types/creditCard';
import { CreditCardDisplay } from '@/components/ui/CreditCardDisplay';

interface CreditCardCardProps {
  creditCard: CreditCardWithBank;
  onEdit: () => void;
  onArchive: () => void;
}

export function CreditCardCard({ creditCard }: CreditCardCardProps) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/credit-cards/${creditCard.id}/bill`);
  };

  return (
    <CreditCardDisplay
      description={creditCard.description}
      lastFourDigits={creditCard.last_four_digits || '****'}
      brand={creditCard.brand}
      dueDay={creditCard.due_day}
      backgroundImageUrl={creditCard.background_image_url}
      onClick={handleCardClick}
    />
  );
}
