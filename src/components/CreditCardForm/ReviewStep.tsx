import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Palette } from 'lucide-react';
import { CreditCardFormData, FieldValidation, CREDIT_CARD_BRANDS } from '@/types/creditCard';
import { Bank } from '@/hooks/useBanks';

interface ReviewStepProps {
  formData: CreditCardFormData;
  validation: {
    background_image_url: FieldValidation;
  };
  banks: Bank[];
  onFieldChange: (field: keyof CreditCardFormData, value: any) => void;
}

export function ReviewStep({ 
  formData, 
  validation, 
  banks, 
  onFieldChange 
}: ReviewStepProps) {
  const selectedBank = banks.find(bank => bank.id === formData.bank_id);
  const selectedBrand = CREDIT_CARD_BRANDS.find(brand => brand.value === formData.brand);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Finalização</h3>
        <p className="text-muted-foreground">Revise as informações e personalize</p>
      </div>

      <div className="space-y-6">
        {/* Card Preview */}
        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 text-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-sm opacity-80">Cartão de Crédito</p>
                <p className="font-semibold">{formData.description}</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-80">{selectedBrand?.label}</p>
                <p className="text-2xl">{selectedBrand?.icon}</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-lg tracking-wider">
                •••• •••• •••• {formData.last_four_digits}
              </p>
            </div>
            
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs opacity-80">Banco</p>
                <p className="text-sm font-medium">{selectedBank?.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-80">Limite</p>
                <p className="text-sm font-medium">{formatCurrency(formData.limit_amount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Banco</Label>
              <p className="font-medium">{selectedBank?.name}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Descrição</Label>
              <p className="font-medium">{formData.description}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Bandeira</Label>
              <p className="font-medium">{selectedBrand?.label}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Limite</Label>
              <p className="font-medium text-green-600">{formatCurrency(formData.limit_amount)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fechamento</Label>
              <p className="font-medium">Dia {formData.closing_day}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Vencimento</Label>
              <p className="font-medium">Dia {formData.due_day}</p>
            </div>
          </div>
        </div>

        {/* Optional Background Image */}
        <div>
          <Label htmlFor="backgroundImage">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Imagem de Fundo (Opcional)
            </div>
          </Label>
          <Input
            id="backgroundImage"
            placeholder="URL da imagem de fundo"
            value={formData.background_image_url}
            onChange={(e) => onFieldChange('background_image_url', e.target.value)}
            className="h-12"
          />
          {!validation.background_image_url.isValid && (
            <p className="text-sm text-red-500 mt-1">{validation.background_image_url.message}</p>
          )}
        </div>

        {/* Success Message */}
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              Pronto para finalizar!
            </span>
          </div>
          <p className="text-xs text-green-600 dark:text-green-400">
            Todas as informações foram preenchidas corretamente.
          </p>
        </div>
      </div>
    </div>
  );
}