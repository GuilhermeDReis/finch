import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Building2 } from 'lucide-react';
import { CreditCardFormData, FieldValidation } from '@/types/creditCard';
import { Bank } from '@/hooks/useBanks';

interface BankSelectionStepProps {
  formData: CreditCardFormData;
  validation: {
    bank_id: FieldValidation;
    description: FieldValidation;
  };
  banks: Bank[];
  onFieldChange: (field: keyof CreditCardFormData, value: any) => void;
}

export function BankSelectionStep({ 
  formData, 
  validation, 
  banks, 
  onFieldChange 
}: BankSelectionStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Informações Básicas</h3>
        <p className="text-muted-foreground">Selecione o banco e descreva seu cartão</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="bank">Banco *</Label>
          <Select
            value={formData.bank_id}
            onValueChange={(value) => onFieldChange('bank_id', value)}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Selecione o banco" />
            </SelectTrigger>
            <SelectContent>
              {banks.map((bank) => (
                <SelectItem key={bank.id} value={bank.id}>
                  <div className="flex items-center gap-2">
                    {bank.icon_url && (
                      <img 
                        src={bank.icon_url} 
                        alt={bank.name} 
                        className="w-5 h-5 rounded" 
                      />
                    )}
                    <span>{bank.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!validation.bank_id.isValid && (
            <p className="text-sm text-red-500 mt-1">{validation.bank_id.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="description">Descrição do Cartão *</Label>
          <Input
            id="description"
            placeholder="Ex: Cartão Principal, Cartão de Viagem..."
            value={formData.description}
            onChange={(e) => onFieldChange('description', e.target.value)}
            className="h-12"
          />
          {!validation.description.isValid && (
            <p className="text-sm text-red-500 mt-1">{validation.description.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}