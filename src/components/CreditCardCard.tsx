import { useNavigate } from 'react-router-dom';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

import { CreditCardWithBank } from '@/types/creditCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface CreditCardCardProps {
  creditCard: CreditCardWithBank;
  onEdit: () => void;
  onArchive: () => void;
}

// Emblema da bandeira do cartão com tamanhos padronizados
const getCardBrandIcon = (brand: string) => {
  const brandLower = brand?.toLowerCase();
  
  switch (brandLower) {
    case 'visa':
      return (
        <div className="w-10 h-6 bg-blue-600 rounded-sm flex items-center justify-center">
          <span className="text-white text-xs font-bold">VISA</span>
        </div>
      );
    case 'mastercard':
      return (
        <div className="flex items-center w-10 h-6 justify-center">
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          <div className="w-4 h-4 bg-yellow-500 rounded-full -ml-2"></div>
        </div>
      );
    case 'elo':
      return (
        <div className="w-10 h-6 bg-yellow-400 rounded-sm flex items-center justify-center">
          <span className="text-black text-xs font-bold">ELO</span>
        </div>
      );
    case 'american_express':
      return (
        <div className="w-10 h-6 bg-blue-800 rounded-sm flex items-center justify-center">
          <span className="text-white text-xs font-bold">AMEX</span>
        </div>
      );
    case 'hipercard':
      return (
        <div className="w-10 h-6 bg-red-500 rounded-sm flex items-center justify-center">
          <span className="text-white text-xs font-bold">HIPER</span>
        </div>
      );
    default:
      return (
        <div className="w-10 h-6 bg-gray-500 rounded-sm flex items-center justify-center">
          <span className="text-white text-xs font-bold">CARD</span>
        </div>
      );
  }
};

export function CreditCardCard({ creditCard, onEdit, onArchive }: CreditCardCardProps) {
  const navigate = useNavigate();

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking on dropdown menu
    if ((e.target as Element).closest('[data-dropdown-trigger]')) {
      return;
    }
    navigate(`/credit-cards/${creditCard.id}/bill`);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className={cn(
        "relative w-60 h-40 rounded-lg cursor-pointer transition-all duration-300 p-5",
        "bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200",
        "shadow-sm hover:shadow-lg hover:-translate-y-1"
      )}
      onClick={handleCardClick}
    >
      {/* Header - Logo do banco (esquerda) e Emblema da bandeira (direita) */}
      <div className="flex justify-between items-start mb-4">
        {/* Logo do banco */}
        <div className="flex items-center">
          {creditCard.banks?.icon_url ? (
            <img 
              src={creditCard.banks.icon_url} 
              alt={creditCard.banks.name}
              className="w-10 h-10 object-contain"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-300 rounded flex items-center justify-center">
              <span className="text-gray-600 text-sm font-bold">
                {creditCard.banks?.name?.charAt(0) || 'B'}
              </span>
            </div>
          )}
        </div>
        
        {/* Emblema da bandeira */}
        <div className="flex items-center">
          {getCardBrandIcon(creditCard.brand)}
        </div>
      </div>

      {/* Nome do cartão - Destaque principal */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800 truncate">
          {creditCard.description || 'Cartão Principal'}
        </h3>
      </div>

      {/* Footer - Últimos dígitos (esquerda) e Ações (direita) */}
      <div className="flex justify-between items-end">
        {/* Últimos dígitos simplificados */}
        <span className="text-sm font-mono text-gray-600 tracking-wider">
          **** {creditCard.last_four_digits || '****'}
        </span>
        
        {/* Menu de ações */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 hover:bg-gray-200"
              data-dropdown-trigger
              onClick={handleMenuClick}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-red-600" 
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
              }}
            >
              Arquivar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
