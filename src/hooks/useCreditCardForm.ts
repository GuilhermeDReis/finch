import { useState, useCallback } from 'react';
import { CreditCardFormData, CreditCardValidation } from '@/types/creditCard';
import { CreditCardValidationService } from '@/services/creditCardValidation';

export interface CreditCardFormState {
  formData: CreditCardFormData;
  validation: CreditCardValidation;
  currentStep: number;
  isLoading: boolean;
  error: string | null;
}

export interface CreditCardFormActions {
  updateFormData: (field: keyof CreditCardFormData, value: any) => void;
  updateMultipleFields: (fields: Partial<CreditCardFormData>) => void;
  validateCurrentStep: () => boolean;
  nextStep: () => void;
  previousStep: () => void;
  setStep: (step: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetForm: () => void;
  initializeForm: (initialData?: Partial<CreditCardFormData>) => void;
}

const INITIAL_FORM_DATA: CreditCardFormData = {
  bank_id: '',
  limit_amount: 0,
  description: '',
  brand: 'visa',
  closing_day: 1,
  due_day: 10,
  last_four_digits: '',
  background_image_url: '',
};

const INITIAL_VALIDATION: CreditCardValidation = {
  bank_id: { isValid: false, message: '' },
  limit_amount: { isValid: false, message: '' },
  description: { isValid: false, message: '' },
  brand: { isValid: true, message: '' },
  closing_day: { isValid: true, message: '' },
  due_day: { isValid: true, message: '' },
  last_four_digits: { isValid: false, message: '' },
  background_image_url: { isValid: true, message: '' },
};

export function useCreditCardForm(initialData?: Partial<CreditCardFormData>) {
  const [state, setState] = useState<CreditCardFormState>({
    formData: { ...INITIAL_FORM_DATA, ...initialData },
    validation: INITIAL_VALIDATION,
    currentStep: 1,
    isLoading: false,
    error: null,
  });

  const updateFormData = useCallback((field: keyof CreditCardFormData, value: any) => {
    setState(prev => {
      const newFormData = { ...prev.formData, [field]: value };
      const fieldValidation = CreditCardValidationService.validateField(field, value, newFormData);
      
      return {
        ...prev,
        formData: newFormData,
        validation: {
          ...prev.validation,
          [field]: fieldValidation,
        },
        error: null,
      };
    });
  }, []);

  const updateMultipleFields = useCallback((fields: Partial<CreditCardFormData>) => {
    setState(prev => {
      const newFormData = { ...prev.formData, ...fields };
      const newValidation = { ...prev.validation };

      // Validate all updated fields
      Object.entries(fields).forEach(([field, value]) => {
        newValidation[field as keyof CreditCardFormData] = 
          CreditCardValidationService.validateField(field as keyof CreditCardFormData, value, newFormData);
      });

      return {
        ...prev,
        formData: newFormData,
        validation: newValidation,
        error: null,
      };
    });
  }, []);

  const validateCurrentStep = useCallback(() => {
    const stepValidation = CreditCardValidationService.validateStep(state.currentStep, state.formData);
    
    setState(prev => ({
      ...prev,
      validation: { ...prev.validation, ...stepValidation.fieldValidations },
    }));

    return stepValidation.isValid;
  }, [state.currentStep, state.formData]);

  const nextStep = useCallback(() => {
    if (validateCurrentStep() && state.currentStep < 4) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
    }
  }, [validateCurrentStep, state.currentStep]);

  const previousStep = useCallback(() => {
    if (state.currentStep > 1) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }));
    }
  }, [state.currentStep]);

  const setStep = useCallback((step: number) => {
    if (step >= 1 && step <= 4) {
      setState(prev => ({ ...prev, currentStep: step }));
    }
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const resetForm = useCallback(() => {
    setState({
      formData: INITIAL_FORM_DATA,
      validation: INITIAL_VALIDATION,
      currentStep: 1,
      isLoading: false,
      error: null,
    });
  }, []);

  const initializeForm = useCallback((initialData?: Partial<CreditCardFormData>) => {
    const formData = { ...INITIAL_FORM_DATA, ...initialData };
    const validation = CreditCardValidationService.validateCreditCard(formData);

    setState({
      formData,
      validation,
      currentStep: 1,
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
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
  };
}