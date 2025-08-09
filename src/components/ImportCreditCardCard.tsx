import React from 'react';
import { CreditCardDisplay } from '@/components/ui/CreditCardDisplay';
import { CreditCard } from '@/types/creditCard';

interface ImportCreditCardCardProps {
  card: CreditCard;
  isSelected: boolean;
  onClick: () => void;
}

export default function ImportCreditCardCard({ card, isSelected, onClick }: ImportCreditCardCardProps) {
  return (
    <CreditCardDisplay
      description={card.description}
      lastFourDigits={card.last_four_digits}
      brand={card.brand}
      dueDay={card.due_day}
      backgroundImageUrl={card.background_image_url}
      onClick={onClick}
      isSelected={isSelected}
    />
  );
}
