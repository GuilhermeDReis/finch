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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  CreditCard, 
  Building2, 
  Calendar, 
  DollarSign, 
  Image, 
  ChevronLeft, 
  ChevronRight,
  Check,
  Info
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCardWithBank, CreditCardFormData, CREDIT_CARD_BRANDS } from '@/types/creditCard';
import { CreditCardValidationService } from '@/services/creditCardValidation';
import { Tables } from '@/integrations/supabase/types';

interface CreditCardModalProps {
  isOpen: boolean;
  creditCard?: CreditCardWithBank | null;
  onClose: () => void;
  onSuccess?: () => void;
}

type Bank = Tables<'banks'>;

// Definir as etapas do formulário
const STEPS = [
  { id: 1, title: 'Informações Básicas', icon: Building2, description: 'Banco e descrição do cartão' },
  { id: 2, title: 'Detalhes do Cartão', icon: CreditCard, description: 'Bandeira e últimos dígitos' },
  { id: 3, title: 'Configurações', icon: Calendar, description: 'Limite e datas importantes' },
  { id: 4, title: 'Finalização', icon: Check, description: 'Revisar e confirmar' }
];

export function CreditCardModal({ isOpen, creditCard, onClose, onSuccess }: CreditCardModalProps) {
  const { user, loading: authLoading } = useAuth();
  const isEditing = !!creditCard;
  
  // Log user state for debugging
  useEffect(() => {
    logger.info('CreditCardModal user state:', { user: !!user, userId: user?.id });
  }, [user]);
  
  // Persistent form state - only reset when explicitly needed
  const [currentStep, setCurrentStep] = useState(1);
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
  const [stepValidation, setStepValidation] = useState<Record<number, boolean>>({});
  
  // Track if form has been initialized to prevent unnecessary resets
  const [formInitialized, setFormInitialized] = useState(false);

  // Monitor bank_id changes
  useEffect(() => {
    logger.info('bank_id changed', { 
      bank_id: formData.bank_id, 
      currentStep, 
      isOpen,
      formInitialized 
    });
  }, [formData.bank_id, currentStep, isOpen, formInitialized]);

  // Function to explicitly reset the form
  const resetForm = () => {
    logger.info('Explicitly resetting form');
    const newFormData: CreditCardFormData = {
      bank_id: '',
      limit_amount: 0,
      description: '',
      brand: 'visa',
      closing_day: 15,
      due_day: 20,
      last_four_digits: '',
      background_image_url: '',
    };
    setFormData(newFormData);
    setLimitInput('');
    setCurrentStep(1);
    setErrors({});
    setStepValidation({});
    setFormInitialized(false);
  };

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

  // Initialize form data only when needed
  useEffect(() => {
    if (isOpen) {
      logger.info('Modal opened', { isEditing, creditCard: !!creditCard, formInitialized });
      
      if (creditCard) {
        // Editing mode - always populate with existing data
        const editFormData: CreditCardFormData = {
          bank_id: creditCard.bank_id,
          limit_amount: creditCard.limit_amount,
          description: creditCard.description,
          brand: creditCard.brand as CreditCardFormData['brand'],
          closing_day: creditCard.closing_day,
          due_day: creditCard.due_day,
          last_four_digits: creditCard.last_four_digits || '',
          background_image_url: creditCard.background_image_url || '',
        };
        logger.info('Setting edit form data', editFormData);
        setFormData(editFormData);
        setLimitInput(CreditCardValidationService.formatCurrency(creditCard.limit_amount));
        setCurrentStep(1);
        setErrors({});
        setStepValidation({});
        setFormInitialized(true);
      } else if (!formInitialized) {
        // Creating mode - only reset if not initialized (first time opening)
        const newFormData: CreditCardFormData = {
          bank_id: '',
          limit_amount: 0,
          description: '',
          brand: 'visa',
          closing_day: 15,
          due_day: 20,
          last_four_digits: '',
          background_image_url: '',
        };
        logger.info('Setting new form data (first time)', newFormData);
        setFormData(newFormData);
        setLimitInput('');
        setCurrentStep(1);
        setErrors({});
        setStepValidation({});
        setFormInitialized(true);
      } else {
        // Creating mode - preserve existing form data
        logger.info('Preserving existing form data', formData);
      }
      
      setLoading(false);
    }
  }, [isOpen, creditCard]);

  // Reset form when switching between create and edit modes
  useEffect(() => {
    if (isOpen) {
      const currentMode = !!creditCard;
      const wasEditing = formInitialized && isEditing;
      
      // Reset if switching from edit to create or vice versa
      if (formInitialized && (currentMode !== wasEditing)) {
        logger.info('Mode changed, resetting form', { currentMode, wasEditing });
        setFormInitialized(false);
      }
    }
  }, [isOpen, creditCard, isEditing, formInitialized]);

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

  // Validação por etapa
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    switch (step) {
      case 1:
        if (!formData.bank_id) newErrors.bank_id = 'Selecione um banco';
        if (!formData.description.trim()) newErrors.description = 'Descrição é obrigatória';
        break;
      case 2:
        if (!formData.brand) newErrors.brand = 'Selecione uma bandeira';
        if (!formData.last_four_digits || formData.last_four_digits.length !== 4) {
          newErrors.last_four_digits = 'Digite os 4 últimos dígitos';
        }
        break;
      case 3:
        if (formData.limit_amount <= 0) newErrors.limit_amount = 'Limite deve ser maior que zero';
        if (formData.due_day <= formData.closing_day) {
          newErrors.due_after_closing = 'Data de vencimento deve ser após o fechamento';
        }
        break;
    }
    
    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    setStepValidation(prev => ({ ...prev, [step]: isValid }));
    return isValid;
  };

  const validateForm = () => {
    logger.info('validateForm called with formData:', formData);
    logger.info('Bank ID value during validation', { bank_id: formData.bank_id });
    const validation = CreditCardValidationService.validateCreditCard(formData);
    logger.info('Validation result:', { 
      isValid: validation.isValid, 
      errors: validation.errors,
      formData,
      bankIdInFormData: formData.bank_id
    });
    setErrors(validation.errors);
    return validation.isValid;
  };

  // Navegação entre etapas
  const nextStep = () => {
    logger.info('nextStep called', { currentStep, formData: formData.bank_id });
    if (validateStep(currentStep) && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      logger.info('Moved to next step', { newStep: currentStep + 1, bankId: formData.bank_id });
    }
  };

  const prevStep = () => {
    logger.info('prevStep called', { currentStep, formData: formData.bank_id });
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      logger.info('Moved to previous step', { newStep: currentStep - 1, bankId: formData.bank_id });
    }
  };

  const goToStep = (step: number) => {
    logger.info('goToStep called', { currentStep, targetStep: step, bankId: formData.bank_id });
    if (step <= currentStep || stepValidation[step - 1]) {
      setCurrentStep(step);
      logger.info('Moved to step', { newStep: step, bankId: formData.bank_id });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    logger.info('handleSubmit called', { formData, user: !!user, authLoading });
    
    // Check if auth is still loading
    if (authLoading) {
      logger.warn('Authentication still loading, waiting...');
      toast.error('Aguarde, carregando dados de autenticação...');
      return;
    }
    
    // Check if user is authenticated
    if (!user) {
      logger.warn('User not authenticated');
      toast.error('Você precisa estar logado para criar um cartão');
      return;
    }
    
    // Check if user is on the final step
    if (currentStep !== STEPS.length) {
      logger.warn('User not on final step', { currentStep, totalSteps: STEPS.length });
      toast.error('Complete todas as etapas antes de finalizar');
      return;
    }
    
    const validation = validateForm();
    logger.info('Form validation result', { validation, errors });
    
    if (!validation) {
      logger.warn('Form validation failed', { errors });
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    try {
      setLoading(true);
      logger.info('Starting credit card save operation', { isEditing, formData });

      if (isEditing && creditCard) {
        // Update existing credit card
        const updateData = {
          // Note: bank_id is intentionally omitted (business rule)
          limit_amount: formData.limit_amount,
          description: formData.description.trim(),
          brand: formData.brand,
          closing_day: formData.closing_day,
          due_day: formData.due_day,
          last_four_digits: formData.last_four_digits,
          background_image_url: formData.background_image_url,
        };
        
        logger.info('Updating credit card', { updateData, creditCardId: creditCard.id });
        
        const { error } = await supabase
          .from('credit_cards')
          .update(updateData)
          .eq('id', creditCard.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new credit card
        const insertData = {
          ...formData,
          description: formData.description.trim(),
          user_id: user.id,
        };
        
        logger.info('Creating new credit card', { insertData });
        
        const { error } = await supabase
          .from('credit_cards')
          .insert(insertData);

        if (error) throw error;
      }

      logger.info('Credit card saved successfully');
      toast.success(isEditing ? 'Cartão atualizado com sucesso!' : 'Cartão criado com sucesso!');
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Reset form only for new card creation
      if (!isEditing) {
        resetForm();
      }
      
      onClose();
    } catch (error) {
      logger.error('Error saving credit card', { isEditing, error: error instanceof Error ? error.message : 'Unknown error', formData });
      toast.error('Erro ao salvar cartão de crédito');
    } finally {
      setLoading(false);
    }
  };

  const suggestedDueDays = CreditCardValidationService.getSuggestedDueDays(formData.closing_day);
  const progressPercentage = (currentStep / STEPS.length) * 100;

  // Renderizar conteúdo da etapa atual
  const renderStepContent = () => {
    logger.info('renderStepContent called', { 
      currentStep, 
      bank_id: formData.bank_id,
      formData: formData 
    });
    
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold">Informações Básicas</h3>
              <p className="text-sm text-muted-foreground">Vamos começar com o banco e uma descrição para seu cartão</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bank" className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Banco *
                </Label>
                <Select
                  key={`bank-select-${currentStep}-${formData.bank_id}`}
                  value={formData.bank_id}
                  onValueChange={(value) => {
                    logger.info('Bank select onValueChange', { value, currentBankId: formData.bank_id });
                    handleInputChange('bank_id', value);
                  }}
                  disabled={isEditing}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Selecione o banco do seu cartão" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          {bank.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isEditing && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <Info className="w-4 h-4 text-amber-600" />
                    <p className="text-xs text-amber-700">
                      O banco não pode ser alterado após o cadastro inicial.
                    </p>
                  </div>
                )}
                {errors.bank_id && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    {errors.bank_id}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Descrição do Cartão *
                </Label>
                <Input
                  id="description"
                  placeholder="Ex: Cartão Principal, Cartão Compras, Cartão Viagem..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  maxLength={100}
                  className="h-12"
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    Dê um nome que ajude você a identificar este cartão
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {formData.description.length}/100
                  </Badge>
                </div>
                {errors.description && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    {errors.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold">Detalhes do Cartão</h3>
              <p className="text-sm text-muted-foreground">Agora vamos configurar a bandeira e os últimos dígitos</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brand" className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Bandeira do Cartão *
                </Label>
                <Select
                  value={formData.brand}
                  onValueChange={(value: any) => handleInputChange('brand', value)}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Selecione a bandeira do cartão" />
                  </SelectTrigger>
                  <SelectContent>
                    {CREDIT_CARD_BRANDS.map((brand) => (
                      <SelectItem key={brand.value} value={brand.value}>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          {brand.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.brand && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    {errors.brand}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_four_digits" className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  4 Últimos Dígitos *
                </Label>
                <Input
                  id="last_four_digits"
                  placeholder="1234"
                  value={formData.last_four_digits}
                  onChange={(e) => handleLastFourDigitsChange(e.target.value)}
                  maxLength={4}
                  className="font-mono text-center text-lg h-12 tracking-widest"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Digite apenas os 4 últimos dígitos do seu cartão
                </p>
                {errors.last_four_digits && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    {errors.last_four_digits}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="background_image_url" className="text-sm font-medium flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  URL da Imagem de Fundo (Opcional)
                </Label>
                <Input
                  id="background_image_url"
                  placeholder="https://exemplo.com/imagem-cartao.jpg"
                  value={formData.background_image_url}
                  onChange={(e) => handleInputChange('background_image_url', e.target.value)}
                  className="h-12"
                />
                <p className="text-xs text-muted-foreground">
                  URL da imagem que será exibida como fundo do cartão (opcional)
                </p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Configurações Financeiras</h3>
              <p className="text-sm text-muted-foreground">Configure o limite e as datas importantes do seu cartão</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="limit" className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Limite do Cartão *
                </Label>
                <Input
                  id="limit"
                  placeholder="Ex: 5.000,00"
                  value={limitInput}
                  onChange={(e) => handleLimitChange(e.target.value)}
                  className="h-12 text-lg"
                />
                {errors.limit_amount && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    {errors.limit_amount}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="closing_day" className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Dia Fechamento *
                  </Label>
                  <Select
                    value={formData.closing_day.toString()}
                    onValueChange={handleClosingDayChange}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          Dia {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.closing_day && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      {errors.closing_day}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_day" className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Dia Vencimento *
                  </Label>
                  <Select
                    value={formData.due_day.toString()}
                    onValueChange={(value) => handleInputChange('due_day', parseInt(value))}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          <div className="flex items-center justify-between w-full">
                            <span>Dia {day}</span>
                            {suggestedDueDays.includes(day) && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Sugerido
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.due_day && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      {errors.due_day}
                    </p>
                  )}
                </div>
              </div>

              {errors.due_after_closing && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    {errors.due_after_closing}
                  </AlertDescription>
                </Alert>
              )}

              {suggestedDueDays.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Dica</span>
                  </div>
                  <p className="text-xs text-blue-600">
                    Dias de vencimento sugeridos: {suggestedDueDays.join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold">Revisar e Confirmar</h3>
              <p className="text-sm text-muted-foreground">Confira todas as informações antes de finalizar</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumo do Cartão</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Banco</Label>
                    <p className="font-medium">{banks.find(b => b.id === formData.bank_id)?.name || 'Não selecionado'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Descrição</Label>
                    <p className="font-medium">{formData.description || 'Não informado'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Bandeira</Label>
                    <p className="font-medium">{CREDIT_CARD_BRANDS.find(b => b.value === formData.brand)?.label}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Últimos Dígitos</Label>
                    <p className="font-mono font-medium">**** {formData.last_four_digits}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Limite</Label>
                    <p className="font-medium text-green-600">{limitInput}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fechamento/Vencimento</Label>
                    <p className="font-medium">Dia {formData.closing_day} / Dia {formData.due_day}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">
                  {isEditing ? 'Editar Cartão de Crédito' : 'Novo Cartão de Crédito'}
                </DialogTitle>
                <DialogDescription>
                  {isEditing 
                    ? 'Atualize as informações do seu cartão de crédito.'
                    : 'Adicione um novo cartão de crédito para gerenciar seus gastos.'
                  }
                </DialogDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                Etapa {currentStep} de {STEPS.length}
              </Badge>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress value={progressPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                {STEPS.map((step) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => goToStep(step.id)}
                    className={`flex flex-col items-center gap-1 transition-colors ${
                      step.id === currentStep 
                        ? 'text-primary' 
                        : step.id < currentStep || stepValidation[step.id]
                          ? 'text-green-600 hover:text-green-700' 
                          : 'text-muted-foreground hover:text-foreground'
                    }`}
                    disabled={step.id > currentStep && !stepValidation[step.id - 1]}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                      step.id === currentStep 
                        ? 'border-primary bg-primary text-primary-foreground' 
                        : step.id < currentStep || stepValidation[step.id]
                          ? 'border-green-600 bg-green-600 text-white'
                          : 'border-muted-foreground'
                    }`}>
                      {step.id < currentStep || stepValidation[step.id] ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <step.icon className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-xs font-medium hidden sm:block">{step.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </DialogHeader>

          <Separator />

          <div className="flex-1 overflow-y-auto py-4">
            {renderStepContent()}
          </div>

          <Separator />

          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Anterior
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              {currentStep < STEPS.length ? (
                <Button type="button" onClick={nextStep}>
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
                  {loading ? 'Salvando...' : (isEditing ? 'Atualizar Cartão' : 'Criar Cartão')}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
