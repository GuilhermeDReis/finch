import { useNavigate } from 'react-router-dom';
import { MoreVertical } from 'lucide-react';

import { CreditCardWithBank } from '@/types/creditCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { CreditCardDisplay } from '@/components/ui/CreditCardDisplay';

interface CreditCardCardProps {
  creditCard: CreditCardWithBank;
  onEdit: () => void;
  onArchive: () => void;
}

export function CreditCardCard({ creditCard, onEdit, onArchive }: CreditCardCardProps) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/credit-cards/${creditCard.id}/bill`);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <CreditCardDisplay
      description={creditCard.description}
      lastFourDigits={creditCard.last_four_digits || '****'}
      brand={creditCard.brand}
      backgroundImageUrl={creditCard.background_image_url}
      onClick={handleCardClick}
    >
      {/* Menu de ações */}
      <div className="absolute top-4 left-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-white hover:bg-white/20 shadow-md"
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
    </CreditCardDisplay>
  );
}
