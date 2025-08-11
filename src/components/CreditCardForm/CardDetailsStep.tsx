import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CreditCard } from 'lucide-react';
import { CreditCardFormData, FieldValidation, CREDIT_CARD_BRANDS } from '@/types/creditCard';

interface CardDetailsStepProps {
  formData: CreditCardFormData;
  validation: {
    brand: FieldValidation;
    last_four_digits: FieldValidation;
  };
  onFieldChange: (field: keyof CreditCardFormData, value: any) => void;
}

export function CardDetailsStep({ 
  formData, 
  validation, 
  onFieldChange 
}: CardDetailsStepProps) {
  const handleLastFourDigitsChange = (value: string) => {
    // Only allow numbers and limit to 4 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 4);
    onFieldChange('last_four_digits', numericValue);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-8 h-8 text-purple-600 dark:text-purple-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Detalhes do Cartão</h3>
        <p className="text-muted-foreground">Bandeira e últimos dígitos do cartão</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="brand">Bandeira *</Label>
          <Select
            value={formData.brand}
            onValueChange={(value) => onFieldChange('brand', value)}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Selecione a bandeira" />
            </SelectTrigger>
            <SelectContent>
              {CREDIT_CARD_BRANDS.map((brand) => (
                <SelectItem key={brand.value} value={brand.value}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{brand.icon}</span>
                    <span>{brand.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!validation.brand.isValid && (
            <p className="text-sm text-red-500 mt-1">{validation.brand.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="lastFourDigits">Últimos 4 Dígitos *</Label>
          <Input
            id="lastFourDigits"
            placeholder="1234"
            value={formData.last_four_digits}
            onChange={(e) => handleLastFourDigitsChange(e.target.value)}
            className="h-12 text-center text-lg tracking-widest"
            maxLength={4}
          />
          {!validation.last_four_digits.isValid && (
            <p className="text-sm text-red-500 mt-1">{validation.last_four_digits.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}