import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

interface ImportCreditCardCardProps {
  card: CreditCard;
  bankIconUrl?: string;
  isSelected: boolean;
  onClick: () => void;
}

// Emblema da bandeira do cartão (igual ao CreditCardCard)
const getCardBrandIcon = (brand: string) => {
  const brandLower = brand?.toLowerCase();
  
  switch (brandLower) {
    case 'visa':
      return (
        <div className="w-8 h-5 bg-blue-600 rounded-sm flex items-center justify-center">
          <span className="text-white text-xs font-bold">VISA</span>
        </div>
      );
    case 'mastercard':
      return (
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          <div className="w-4 h-4 bg-yellow-500 rounded-full -ml-2"></div>
        </div>
      );
    case 'elo':
      return (
        <div className="w-8 h-5 bg-yellow-400 rounded-sm flex items-center justify-center">
          <span className="text-black text-xs font-bold">ELO</span>
        </div>
      );
    case 'american_express':
      return (
        <div className="w-8 h-5 bg-blue-800 rounded-sm flex items-center justify-center">
          <span className="text-white text-xs font-bold">AMEX</span>
        </div>
      );
    case 'hipercard':
      return (
        <div className="w-8 h-5 bg-red-500 rounded-sm flex items-center justify-center">
          <span className="text-white text-xs font-bold">HIPER</span>
        </div>
      );
    default:
      return (
        <div className="w-8 h-5 bg-gray-500 rounded-sm flex items-center justify-center">
          <span className="text-white text-xs font-bold">CARD</span>
        </div>
      );
  }
};

// Componente do chip do cartão (igual ao CreditCardCard)
const CreditCardChip = () => (
  <div className="w-8 h-6 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-sm border border-yellow-600 flex items-center justify-center">
    <div className="grid grid-cols-3 gap-px">
      {[...Array(9)].map((_, i) => (
        <div key={i} className="w-0.5 h-0.5 bg-yellow-700 rounded-full" />
      ))}
    </div>
  </div>
);

export default function ImportCreditCardCard({ card, bankIconUrl, isSelected, onClick }: ImportCreditCardCardProps) {
  return (
    <div
      className={cn(
        "relative w-60 h-36 rounded-lg cursor-pointer transition-all duration-300",
        "bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200",
        "hover:shadow-md hover:-translate-y-1",
        isSelected && "ring-2 ring-blue-500 ring-offset-2 shadow-lg"
      )}
      onClick={onClick}
    >
      {/* Header - Logo do banco (esquerda) e Emblema da bandeira (direita) */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
      {/* Logo do banco - placeholder genérico ou imagem do banco */}
      <div className="flex items-center">
        {bankIconUrl ? (
          <img src={bankIconUrl} alt="Bank Logo" className="w-8 h-8 rounded object-contain" />
        ) : (
          <div className="w-8 h-8 bg-gray-300 rounded flex items-center justify-center">
            <span className="text-gray-600 text-xs font-bold">B</span>
          </div>
        )}
      </div>
        
        {/* Emblema da bandeira */}
        <div className="flex items-center">
          {getCardBrandIcon(card.brand)}
        </div>
      </div>

      {/* Centro - Nome do cartão */}
      <div className="absolute top-4 left-16 right-16 flex justify-center items-start">
        <span className="text-sm font-medium text-gray-700 text-center truncate">
          {card.description || 'Cartão Principal'}
        </span>
      </div>

      {/* Chip do cartão */}
      <div className="absolute top-16 left-4">
        <CreditCardChip />
      </div>

      {/* Número do cartão - 4 últimos dígitos */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-center">
        <span className="text-sm font-mono text-gray-600 tracking-wider">
          **** **** **** {card.last_four_digits || '****'}
        </span>
      </div>

      {/* Indicador de seleção */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
            <Check className="w-4 h-4 text-white" />
          </div>
        </div>
      )}

      {/* Overlay sutil de seleção */}
      {isSelected && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-5 rounded-lg pointer-events-none" />
      )}
    </div>
  );
}
