import React from 'react';
import { Check, CreditCard } from 'lucide-react';
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
  isSelected: boolean;
  onClick: () => void;
}

// Mapeamento de tipos de cartão para ícones/cores
const getCardBrandIcon = (brand: string) => {
  const brandLower = brand?.toLowerCase();
  
  switch (brandLower) {
    case 'visa':
      return (
        <div className="w-6 h-4 bg-blue-600 rounded-sm flex items-center justify-center">
          <span className="text-white text-xs font-bold">V</span>
        </div>
      );
    case 'mastercard':
      return (
        <div className="flex">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full -ml-1"></div>
        </div>
      );
    case 'elo':
      return (
        <div className="w-6 h-4 bg-yellow-400 rounded-sm flex items-center justify-center">
          <span className="text-black text-xs font-bold">E</span>
        </div>
      );
    case 'amex':
    case 'american_express':
      return (
        <div className="w-6 h-4 bg-blue-800 rounded-sm flex items-center justify-center">
          <span className="text-white text-xs font-bold">A</span>
        </div>
      );
    default:
      return (
        <CreditCard className="w-6 h-4 text-gray-400" />
      );
  }
};

const getChipIcon = () => (
  <div className="flex space-x-1">
    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
  </div>
);

export default function ImportCreditCardCard({ card, isSelected, onClick }: ImportCreditCardCardProps) {
  return (
    <div
      className={cn(
        "relative w-60 h-36 rounded-lg cursor-pointer transition-all duration-300",
        "bg-gradient-to-br from-gray-50 to-gray-100 border",
        "hover:shadow-md hover:-translate-y-1",
        isSelected 
          ? "border-2 border-blue-500 bg-blue-50 shadow-lg" 
          : "border border-gray-200 hover:border-gray-300"
      )}
      onClick={onClick}
    >
      {/* Header - Bandeira e Chip */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
        <div className="flex items-center">
          {getCardBrandIcon(card.brand)}
        </div>
        <div className="relative">
          {isSelected ? (
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          ) : (
            getChipIcon()
          )}
        </div>
      </div>

      {/* Área Central - Espaço vazio para manter proporção */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5">
        <CreditCard className="w-16 h-16 text-gray-400" />
      </div>

      {/* Footer - Nome e últimos dígitos */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-700 truncate max-w-32">
            {card.description || 'Cartão Principal'}
          </span>
        </div>
        <div className="text-sm font-mono text-gray-500">
          **** {card.last_four_digits}
        </div>
      </div>

      {/* Overlay de seleção */}
      {isSelected && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-5 rounded-lg pointer-events-none" />
      )}
    </div>
  );
}
