import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  CreditCard, 
  DollarSign, 
  Calendar, 
  Check, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';
import { CreditCardWithBank, CreditCardFormData } from '@/types/creditCard';
import { useCreditCardForm } from '@/hooks/useCreditCardForm';
import { useCreditCardOperations } from '@/hooks/useCreditCardOperations';
import { useBanks } from '@/hooks/useBanks';
import { 
  BankSelectionStep, 
  CardDetailsStep, 
  ConfigurationStep, 
  ReviewStep 
} from '@/components/CreditCardForm';
import { toast } from 'sonner';
import { getLogger } from '@/utils/logger';

const logger = getLogger('CreditCardModal');

interface CreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingCard?: CreditCardWithBank | null;
}

export function CreditCardModal({ isOpen, onClose, onSuccess, editingCard }: CreditCardModalProps) {
  const { banks, isLoading: banksLoading } = useBanks();
  const { createCreditCard, updateCreditCard, isLoading: operationsLoading } = useCreditCardOperations();
  
  const {
    formData,
    validation,
    currentStep,
    isLoading: formLoading,
    error,
    updateFormData,
    updateMultipleFields,
    validateCurrentStep,
    nextStep,
    previousStep,
    setStep,
    setLoading,
    setError,
    resetForm,
    initializeForm,
  } = useCreditCardForm();

  const isLoading = formLoading || operationsLoading || banksLoading;
  const isEditing = !!editingCard;
  
  // Definir as etapas do formulário
  const STEPS = [
    { id: 1, title: 'Informações Básicas', icon: Building2, description: 'Banco e descrição do cartão' },
    { id: 2, title: 'Detalhes do Cartão', icon: CreditCard, description: 'Bandeira e últimos dígitos' },
    { id: 3, title: 'Configurações', icon: Calendar, description: 'Limite e datas importantes' },
    { id: 4, title: 'Finalização', icon: Check, description: 'Revisar e confirmar' }
  ];

  // Initialize form when editing or opening modal
  useEffect(() => {
    if (isOpen) {
      if (isEditing && editingCard) {
        logger.info('Initializing form for editing:', { cardId: editingCard.id });
        initializeForm({
          bank_id: editingCard.bank_id,
          limit_amount: editingCard.limit_amount,
          description: editingCard.description,
          brand: editingCard.brand,
          closing_day: editingCard.closing_day,
          due_day: editingCard.due_day,
          last_four_digits: editingCard.last_four_digits || '',
          background_image_url: editingCard.background_image_url || '',
        });
      } else {
        logger.info('Initializing form for new card');
        resetForm();
      }
    }
  }, [isOpen, isEditing, editingCard, initializeForm, resetForm]);

  const handleInputChange = (field: keyof CreditCardFormData, value: any) => {
    updateFormData(field, value);
  };



  const goToStep = (step: number) => {
    setStep(step);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep !== STEPS.length) {
      toast.error('Complete todas as etapas antes de finalizar');
      return;
    }
    
    if (!validateCurrentStep()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    try {
       setLoading(true);
       
       let success = false;
       if (isEditing && editingCard) {
         success = await updateCreditCard(editingCard.id, formData);
       } else {
         success = await createCreditCard(formData);
       }
       
       if (success) {
         if (onSuccess) {
           onSuccess();
         }
         
         if (!isEditing) {
           resetForm();
         }
         
         onClose();
       }
     } catch (error) {
       logger.error('Error saving credit card', { error });
       setError('Erro ao salvar cartão de crédito');
     } finally {
       setLoading(false);
     }
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;



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
                        : step.id < currentStep
                          ? 'text-green-600 hover:text-green-700' 
                          : 'text-muted-foreground hover:text-foreground'
                    }`}
                    disabled={step.id > currentStep}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                      step.id === currentStep 
                        ? 'border-primary bg-primary text-primary-foreground' 
                        : step.id < currentStep
                          ? 'border-green-600 bg-green-600 text-white'
                          : 'border-muted-foreground'
                    }`}>
                      {step.id < currentStep ? (
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

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {currentStep === 1 && (
              <BankSelectionStep
                formData={formData}
                validation={{
                  bank_id: validation.bank_id,
                  description: validation.description,
                }}
                banks={banks}
                onFieldChange={handleInputChange}
              />
            )}
            
            {currentStep === 2 && (
              <CardDetailsStep
                formData={formData}
                validation={{
                  brand: validation.brand,
                  last_four_digits: validation.last_four_digits,
                }}
                onFieldChange={handleInputChange}
              />
            )}
            
            {currentStep === 3 && (
              <ConfigurationStep
                formData={formData}
                validation={{
                  limit_amount: validation.limit_amount,
                  closing_day: validation.closing_day,
                  due_day: validation.due_day,
                }}
                onFieldChange={handleInputChange}
              />
            )}
            
            {currentStep === 4 && (
              <ReviewStep
                formData={formData}
                validation={{
                  background_image_url: validation.background_image_url,
                }}
                banks={banks}
                onFieldChange={handleInputChange}
              />
            )}
          </div>

          <Separator />

          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={previousStep}>
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
                <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                  {isLoading ? 'Salvando...' : (isEditing ? 'Atualizar Cartão' : 'Criar Cartão')}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
