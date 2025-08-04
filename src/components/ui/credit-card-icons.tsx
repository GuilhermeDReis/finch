import { CreditCardBrand } from '@/types/creditCard';

interface CreditCardIconProps {
  brand: CreditCardBrand;
  className?: string;
}

export function CreditCardIcon({ brand, className = "h-6 w-6" }: CreditCardIconProps) {
  switch (brand) {
    case 'visa':
      return (
        <div className={`${className} bg-blue-600 text-white rounded flex items-center justify-center text-xs font-bold`}>
          VISA
        </div>
      );
    case 'mastercard':
      return (
        <div className={`${className} bg-red-600 text-white rounded flex items-center justify-center text-xs font-bold`}>
          MC
        </div>
      );
    case 'hipercard':
      return (
        <div className={`${className} bg-red-500 text-white rounded flex items-center justify-center text-xs font-bold`}>
          HC
        </div>
      );
    case 'american_express':
      return (
        <div className={`${className} bg-blue-800 text-white rounded flex items-center justify-center text-xs font-bold`}>
          AE
        </div>
      );
    case 'elo':
      return (
        <div className={`${className} bg-yellow-500 text-white rounded flex items-center justify-center text-xs font-bold`}>
          ELO
        </div>
      );
    case 'outra_bandeira':
    default:
      return (
        <div className={`${className} bg-gray-500 text-white rounded flex items-center justify-center text-xs font-bold`}>
          CC
        </div>
      );
  }
}

export function getBrandDisplayName(brand: CreditCardBrand): string {
  switch (brand) {
    case 'visa':
      return 'Visa';
    case 'mastercard':
      return 'Mastercard';
    case 'hipercard':
      return 'HiperCard';
    case 'american_express':
      return 'American Express';
    case 'elo':
      return 'Elo';
    case 'outra_bandeira':
      return 'Outra Bandeira';
    default:
      return 'Cartão';
  }
}
