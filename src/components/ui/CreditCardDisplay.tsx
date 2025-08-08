import React from 'react';
import { cn } from '@/lib/utils';

interface CreditCardDisplayProps {
  /** Descrição/nome do cartão */
  description: string;
  /** Últimos 4 dígitos do cartão */
  lastFourDigits: string;
  /** Bandeira do cartão */
  brand: string;
  /** URL da imagem de fundo do cartão */
  backgroundImageUrl?: string;
  /** Classe CSS adicional */
  className?: string;
  /** Função chamada ao clicar no cartão */
  onClick?: () => void;
  /** Se o cartão está selecionado (para modo de seleção) */
  isSelected?: boolean;
  /** Conteúdo adicional a ser renderizado no cartão */
  children?: React.ReactNode;
}

// Emblema da bandeira do cartão
const getCardBrandIcon = (brand: string) => {
  const brandLower = brand?.toLowerCase();
  
  switch (brandLower) {
    case 'visa':
      return (
        <div className="w-10 h-6 bg-blue-600 rounded-sm flex items-center justify-center shadow-sm">
          <span className="text-white text-xs font-bold">VISA</span>
        </div>
      );
    case 'mastercard':
      return (
        <div className="flex items-center w-10 h-6 justify-center">
          <div className="w-4 h-4 bg-red-500 rounded-full shadow-sm"></div>
          <div className="w-4 h-4 bg-yellow-500 rounded-full -ml-2 shadow-sm"></div>
        </div>
      );
    case 'elo':
      return (
        <div className="w-10 h-6 bg-yellow-400 rounded-sm flex items-center justify-center shadow-sm">
          <span className="text-black text-xs font-bold">ELO</span>
        </div>
      );
    case 'american_express':
      return (
        <div className="w-10 h-6 bg-blue-800 rounded-sm flex items-center justify-center shadow-sm">
          <span className="text-white text-xs font-bold">AMEX</span>
        </div>
      );
    case 'hipercard':
      return (
        <div className="w-10 h-6 bg-red-500 rounded-sm flex items-center justify-center shadow-sm">
          <span className="text-white text-xs font-bold">HIPER</span>
        </div>
      );
    default:
      return (
        <div className="w-10 h-6 bg-gray-500 rounded-sm flex items-center justify-center shadow-sm">
          <span className="text-white text-xs font-bold">CARD</span>
        </div>
      );
  }
};

export function CreditCardDisplay({
  description,
  lastFourDigits,
  brand,
  backgroundImageUrl,
  className,
  onClick,
  isSelected = false,
  children
}: CreditCardDisplayProps) {
  return (
    <div
      className={cn(
        "relative w-[290px] h-[176px] rounded-lg overflow-hidden cursor-pointer transition-all duration-300",
        "shadow-sm hover:shadow-lg hover:-translate-y-1",
        isSelected && "ring-2 ring-blue-500 ring-offset-2 shadow-xl",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
      style={{
        backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Fallback background se não houver imagem */}
      {!backgroundImageUrl && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200" />
      )}
      
      {/* Overlay para melhorar legibilidade do texto */}
      <div className="absolute inset-0 bg-black bg-opacity-10" />
      
      {/* Conteúdo do cartão */}
      <div className="relative z-10 p-4 h-full flex flex-col">
        {/* Header - Bandeira do cartão (canto superior direito) */}
        <div className="flex justify-end mb-3">
          {getCardBrandIcon(brand)}
        </div>
        
        {/* Nome do cartão */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white drop-shadow-lg truncate">
            {description || 'Cartão Principal'}
          </h3>
        </div>
        
        {/* Spacer para empurrar os dígitos para baixo */}
        <div className="flex-1" />
        
        {/* Footer - Últimos dígitos */}
        <div className="flex justify-start">
          <span className="text-sm font-mono text-white drop-shadow-lg tracking-wider">
            **** {lastFourDigits || '****'}
          </span>
        </div>
      </div>
      
      {/* Conteúdo adicional (como botões de ação) */}
      {children}
      
      {/* Indicador de seleção */}
      {isSelected && (
        <div className="absolute top-2 right-2 z-20">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}