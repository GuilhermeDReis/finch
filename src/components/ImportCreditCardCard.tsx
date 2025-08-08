import React from 'react';
import { CreditCardDisplay } from '@/components/ui/CreditCardDisplay';

interface CreditCard {
  id: string;
  description: string;
  last_four_digits: string;
  card_type: string;
  brand: string;
  bank_id: string;
  is_active: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  background_image_url?: string;
}

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
      backgroundImageUrl={card.background_image_url}
      onClick={onClick}
      isSelected={isSelected}
    />
  );
}
