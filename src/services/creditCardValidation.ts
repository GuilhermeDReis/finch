import { CreditCardFormData, CreditCardValidation } from '@/types/creditCard';

export interface FieldValidation {
  isValid: boolean;
  message: string;
}

export interface StepValidation {
  isValid: boolean;
  fieldValidations: Partial<CreditCardValidation>;
}

export class CreditCardValidationService {
  static validateCreditCard(formData: CreditCardFormData): CreditCardValidation {
    return {
      bank_id: this.validateBankId(formData.bank_id),
      limit_amount: this.validateLimitAmount(formData.limit_amount),
      description: this.validateDescription(formData.description),
      brand: this.validateBrand(formData.brand),
      closing_day: this.validateClosingDay(formData.closing_day),
      due_day: this.validateDueDay(formData.due_day, formData.closing_day),
      last_four_digits: this.validateLastFourDigits(formData.last_four_digits),
      background_image_url: this.validateBackgroundImageUrl(formData.background_image_url),
    };
  }

  static validateField(
    field: keyof CreditCardFormData, 
    value: any, 
    formData: CreditCardFormData
  ): FieldValidation {
    switch (field) {
      case 'bank_id':
        return this.validateBankId(value);
      case 'limit_amount':
        return this.validateLimitAmount(value);
      case 'description':
        return this.validateDescription(value);
      case 'brand':
        return this.validateBrand(value);
      case 'closing_day':
        return this.validateClosingDay(value);
      case 'due_day':
        return this.validateDueDay(value, formData.closing_day);
      case 'last_four_digits':
        return this.validateLastFourDigits(value);
      case 'background_image_url':
        return this.validateBackgroundImageUrl(value);
      default:
        return { isValid: true, message: '' };
    }
  }

  static validateStep(step: number, formData: CreditCardFormData): StepValidation {
    const fieldValidations: Partial<CreditCardValidation> = {};
    let isValid = true;

    switch (step) {
      case 1: // Bank selection
        fieldValidations.bank_id = this.validateBankId(formData.bank_id);
        isValid = fieldValidations.bank_id.isValid;
        break;
      
      case 2: // Basic info
        fieldValidations.limit_amount = this.validateLimitAmount(formData.limit_amount);
        fieldValidations.description = this.validateDescription(formData.description);
        fieldValidations.brand = this.validateBrand(formData.brand);
        isValid = fieldValidations.limit_amount.isValid && 
                 fieldValidations.description.isValid && 
                 fieldValidations.brand.isValid;
        break;
      
      case 3: // Dates
        fieldValidations.closing_day = this.validateClosingDay(formData.closing_day);
        fieldValidations.due_day = this.validateDueDay(formData.due_day, formData.closing_day);
        isValid = fieldValidations.closing_day.isValid && fieldValidations.due_day.isValid;
        break;
      
      case 4: // Final details
        fieldValidations.last_four_digits = this.validateLastFourDigits(formData.last_four_digits);
        fieldValidations.background_image_url = this.validateBackgroundImageUrl(formData.background_image_url);
        isValid = fieldValidations.last_four_digits.isValid && 
                 fieldValidations.background_image_url.isValid;
        break;
      
      default:
        isValid = false;
    }

    return { isValid, fieldValidations };
  }

  /**
   * Validates credit card form data
   */
  static validateCreditCardOld(data: Partial<CreditCardFormData>): CreditCardValidation {
    const errors: CreditCardValidation['errors'] = {};

    // Validate bank_id
    if (!data.bank_id || data.bank_id.trim() === '') {
      errors.bank_id = 'Banco é obrigatório';
    }

    // Validate limit_amount
    if (!data.limit_amount || data.limit_amount <= 0) {
      errors.limit_amount = 'Limite deve ser maior que zero';
    } else if (data.limit_amount > 999999999.99) {
      errors.limit_amount = 'Limite não pode exceder R$ 999.999.999,99';
    }

    // Validate description
    if (!data.description || data.description.trim() === '') {
      errors.description = 'Descrição é obrigatória';
    } else if (data.description.trim().length < 3) {
      errors.description = 'Descrição deve ter pelo menos 3 caracteres';
    } else if (data.description.length > 100) {
      errors.description = 'Descrição não pode exceder 100 caracteres';
    }

    // Validate brand
    if (!data.brand) {
      errors.brand = 'Bandeira é obrigatória';
    }

    // Validate closing_day
    if (!data.closing_day || data.closing_day < 1 || data.closing_day > 31) {
      errors.closing_day = 'Dia de fechamento deve estar entre 1 e 31';
    }

    // Validate due_day
    if (!data.due_day || data.due_day < 1 || data.due_day > 31) {
      errors.due_day = 'Dia de vencimento deve estar entre 1 e 31';
    }

    // Validate last_four_digits
    if (!data.last_four_digits || data.last_four_digits.trim() === '') {
      errors.last_four_digits = 'Os 4 últimos dígitos são obrigatórios';
    } else if (data.last_four_digits.length !== 4) {
      errors.last_four_digits = 'Deve conter exatamente 4 dígitos';
    } else if (!/^\d{4}$/.test(data.last_four_digits)) {
      errors.last_four_digits = 'Deve conter apenas números';
    }

    // Business rule: due_day must be after closing_day
    if (data.closing_day && data.due_day && data.due_day <= data.closing_day) {
      errors.due_after_closing = 'Dia de vencimento deve ser posterior ao dia de fechamento';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Validates monetary input and formats it
   */
  static validateAndFormatAmount(value: string): { isValid: boolean; value: number; formatted: string } {
    // Remove non-numeric characters except comma and dot
    const cleanValue = value.replace(/[^\d,.-]/g, '');
    
    // Replace comma with dot for decimal separation
    const normalizedValue = cleanValue.replace(',', '.');
    
    const numericValue = parseFloat(normalizedValue);
    
    if (isNaN(numericValue) || numericValue <= 0) {
      return {
        isValid: false,
        value: 0,
        formatted: ''
      };
    }

    // Format to Brazilian currency without the R$ symbol
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericValue);

    return {
      isValid: true,
      value: numericValue,
      formatted
    };
  }

  /**
   * Format currency value for display
   */
  static formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  /**
   * Validates day input (1-31)
   */
  static validateDay(day: number): boolean {
    return day >= 1 && day <= 31;
  }

  /**
   * Check if due day is valid for the given closing day
   */
  static isDueDayValid(closingDay: number, dueDay: number): boolean {
    return dueDay > closingDay;
  }

  /**
   * Get suggested due dates based on closing day
   */
  static getSuggestedDueDays(closingDay: number): number[] {
    const suggestions: number[] = [];
    
    // Suggest days that are 5-25 days after closing
    for (let i = 5; i <= 25; i += 5) {
      const suggestedDay = closingDay + i;
      if (suggestedDay <= 31) {
        suggestions.push(suggestedDay);
      }
    }

    // If closing day is late in the month, suggest early days of next month
    if (closingDay > 20) {
      suggestions.push(5, 10, 15);
    }

    return suggestions.filter((day, index, arr) => arr.indexOf(day) === index).sort((a, b) => a - b);
  }
}
