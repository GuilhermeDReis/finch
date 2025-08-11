import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';
import { CreditCardFormData, FieldValidation } from '@/types/creditCard';

interface ConfigurationStepProps {
  formData: CreditCardFormData;
  validation: {
    limit_amount: FieldValidation;
    closing_day: FieldValidation;
    due_day: FieldValidation;
  };
  onFieldChange: (field: keyof CreditCardFormData, value: any) => void;
  onLimitChange: (value: string) => void;
}

export function ConfigurationStep({ 
  formData, 
  validation, 
  onFieldChange,
  onLimitChange
}: ConfigurationStepProps) {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const generateDayOptions = () => {
    return Array.from({ length: 31 }, (_, i) => i + 1);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Configurações</h3>
        <p className="text-muted-foreground">Limite e datas importantes</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="limit">Limite do Cartão *</Label>
          <Input
            id="limit"
            placeholder="Ex: 5.000,00"
            value={formData.limit_amount ? formatCurrency(formData.limit_amount) : ''}
            onChange={(e) => onLimitChange(e.target.value)}
            className="h-12 text-lg"
          />
          {!validation.limit_amount.isValid && (
            <p className="text-sm text-red-500 mt-1">{validation.limit_amount.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="closingDay">Dia de Fechamento *</Label>
            <Select
              value={formData.closing_day.toString()}
              onValueChange={(value) => onFieldChange('closing_day', parseInt(value))}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Dia" />
              </SelectTrigger>
              <SelectContent>
                {generateDayOptions().map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    Dia {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!validation.closing_day.isValid && (
              <p className="text-sm text-red-500 mt-1">{validation.closing_day.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="dueDay">Dia de Vencimento *</Label>
            <Select
              value={formData.due_day.toString()}
              onValueChange={(value) => onFieldChange('due_day', parseInt(value))}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Dia" />
              </SelectTrigger>
              <SelectContent>
                {generateDayOptions().map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    <div className="flex items-center justify-between w-full">
                      <span>Dia {day}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!validation.due_day.isValid && (
              <p className="text-sm text-red-500 mt-1">{validation.due_day.message}</p>
            )}
          </div>
        </div>

        {formData.due_day <= formData.closing_day && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              ⚠️ O dia de vencimento deve ser posterior ao dia de fechamento
            </p>
          </div>
        )}
      </div>
    </div>
  );
}