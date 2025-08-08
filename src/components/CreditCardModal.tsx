import { useState, useEffect } from 'react';
import { getLogger } from '@/utils/logger';

const logger = getLogger('creditCardModal');
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCardWithBank, CreditCardFormData, CREDIT_CARD_BRANDS } from '@/types/creditCard';
import { CreditCardValidationService } from '@/services/creditCardValidation';
import { Tables } from '@/integrations/supabase/types';

interface CreditCardModalProps {
  creditCard?: CreditCardWithBank | null;
  onClose: () => void;
  onSave: () => void;
}

type Bank = Tables<'banks'>;

export function CreditCardModal({ creditCard, onClose, onSave }: CreditCardModalProps) {
  const { user } = useAuth();
  const isEditing = !!creditCard;
  
  const [formData, setFormData] = useState<CreditCardFormData>({
    bank_id: '',
    limit_amount: 0,
    description: '',
    brand: 'visa',
    closing_day: 15,
    due_day: 20,
    last_four_digits: '',
    background_image_url: '',
  });
  
  const [banks, setBanks] = useState<Bank[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [limitInput, setLimitInput] = useState('');

  // Load banks on component mount
  useEffect(() => {
      const loadBanks = async () => {
      try {
        const { data, error } = await supabase
          .from('banks')
          .select('*')
          .order('name');

        if (error) throw error;
        setBanks(data || []);
      } catch (error) {
        logger.error('Error loading banks', { error: error instanceof Error ? error.message : 'Unknown error' });
        toast.error('Erro ao carregar bancos');
      }
    };

    loadBanks();
  }, []);

  // Populate form data when editing
  useEffect(() => {
    if (creditCard) {
      setFormData({
        bank_id: creditCard.bank_id,
        limit_amount: creditCard.limit_amount,
        description: creditCard.description,
        brand: creditCard.brand,
        closing_day: creditCard.closing_day,
        due_day: creditCard.due_day,
        last_four_digits: creditCard.last_four_digits || '',
        background_image_url: creditCard.background_image_url || '',
      });
      setLimitInput(CreditCardValidationService.formatCurrency(creditCard.limit_amount));
    }
  }, [creditCard]);

  const handleInputChange = (field: keyof CreditCardFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleLimitChange = (value: string) => {
    setLimitInput(value);
    const result = CreditCardValidationService.validateAndFormatAmount(value);
    
    if (result.isValid) {
      handleInputChange('limit_amount', result.value);
      setLimitInput(result.formatted);
    }
  };

  const handleLastFourDigitsChange = (value: string) => {
    // Only allow numbers and limit to 4 digits
    const cleanValue = value.replace(/\D/g, '').slice(0, 4);
    handleInputChange('last_four_digits', cleanValue);
  };

  const handleClosingDayChange = (value: string) => {
    const day = parseInt(value);
    handleInputChange('closing_day', day);
    
    // Auto-suggest due day if it's invalid
    if (formData.due_day <= day) {
      const suggestions = CreditCardValidationService.getSuggestedDueDays(day);
      if (suggestions.length > 0) {
        handleInputChange('due_day', suggestions[0]);
      }
    }
  };

  const validateForm = () => {
    const validation = CreditCardValidationService.validateCreditCard(formData);
    setErrors(validation.errors);
    return validation.isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user) return;

    try {
      setLoading(true);

      if (isEditing && creditCard) {
        // Update existing credit card
        const { error } = await supabase
          .from('credit_cards')
          .update({
            // Note: bank_id is intentionally omitted (business rule)
            limit_amount: formData.limit_amount,
            description: formData.description.trim(),
            brand: formData.brand,
            closing_day: formData.closing_day,
            due_day: formData.due_day,
            last_four_digits: formData.last_four_digits,
          })
          .eq('id', creditCard.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new credit card
        const { error } = await supabase
          .from('credit_cards')
          .insert({
            ...formData,
            description: formData.description.trim(),
            user_id: user.id,
          });

        if (error) throw error;
      }

      onSave();
    } catch (error) {
      logger.error('Error saving credit card', { isEditing, error: error instanceof Error ? error.message : 'Unknown error' });
      toast.error('Erro ao salvar cartão de crédito');
    } finally {
      setLoading(false);
    }
  };

  const suggestedDueDays = CreditCardValidationService.getSuggestedDueDays(formData.closing_day);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Cartão de Crédito' : 'Novo Cartão de Crédito'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Atualize as informações do seu cartão de crédito.'
              : 'Adicione um novo cartão de crédito para gerenciar seus gastos.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Bank Selection */}
          <div className="space-y-2">
            <Label htmlFor="bank">Banco *</Label>
            <Select
              value={formData.bank_id}
              onValueChange={(value) => handleInputChange('bank_id', value)}
              disabled={isEditing} // Business rule: bank cannot be changed
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o banco" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEditing && (
              <p className="text-xs text-muted-foreground">
                O banco não pode ser alterado após o cadastro inicial.
              </p>
            )}
            {errors.bank_id && (
              <p className="text-sm text-red-500">{errors.bank_id}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              placeholder="Ex: Cartão Principal, Cartão Compras, etc."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              {formData.description.length}/100 caracteres
            </p>
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          {/* Brand */}
          <div className="space-y-2">
            <Label htmlFor="brand">Bandeira *</Label>
            <Select
              value={formData.brand}
              onValueChange={(value: any) => handleInputChange('brand', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a bandeira" />
              </SelectTrigger>
              <SelectContent>
                {CREDIT_CARD_BRANDS.map((brand) => (
                  <SelectItem key={brand.value} value={brand.value}>
                    {brand.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.brand && (
              <p className="text-sm text-red-500">{errors.brand}</p>
            )}
          </div>

          {/* Last Four Digits */}
          <div className="space-y-2">
            <Label htmlFor="last_four_digits">4 Últimos Dígitos *</Label>
            <Input
              id="last_four_digits"
              placeholder="1234"
              value={formData.last_four_digits}
              onChange={(e) => handleLastFourDigitsChange(e.target.value)}
              maxLength={4}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Digite apenas os 4 últimos dígitos do cartão
            </p>
            {errors.last_four_digits && (
              <p className="text-sm text-red-500">{errors.last_four_digits}</p>
            )}
          </div>

          {/* Background Image URL */}
          <div className="space-y-2">
            <Label htmlFor="background_image_url">URL da Imagem de Fundo</Label>
            <Input
              id="background_image_url"
              placeholder="https://exemplo.com/imagem-cartao.jpg"
              value={formData.background_image_url}
              onChange={(e) => handleInputChange('background_image_url', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              URL da imagem que será exibida como fundo do cartão
            </p>
          </div>

          {/* Limit Amount */}
          <div className="space-y-2">
            <Label htmlFor="limit">Limite *</Label>
            <Input
              id="limit"
              placeholder="Ex: 5.000,00"
              value={limitInput}
              onChange={(e) => handleLimitChange(e.target.value)}
            />
            {errors.limit_amount && (
              <p className="text-sm text-red-500">{errors.limit_amount}</p>
            )}
          </div>

          {/* Closing and Due Days */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="closing_day">Dia Fechamento *</Label>
              <Select
                value={formData.closing_day.toString()}
                onValueChange={handleClosingDayChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.closing_day && (
                <p className="text-sm text-red-500">{errors.closing_day}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_day">Dia Vencimento *</Label>
              <Select
                value={formData.due_day.toString()}
                onValueChange={(value) => handleInputChange('due_day', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                      {suggestedDueDays.includes(day) && (
                        <span className="ml-1 text-xs text-green-600">✓</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.due_day && (
                <p className="text-sm text-red-500">{errors.due_day}</p>
              )}
            </div>
          </div>

          {/* Business Rule Warning */}
          {errors.due_after_closing && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {errors.due_after_closing}
              </AlertDescription>
            </Alert>
          )}

          {/* Suggested Due Days */}
          {suggestedDueDays.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Dias de vencimento sugeridos: {suggestedDueDays.join(', ')}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Cadastrar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
