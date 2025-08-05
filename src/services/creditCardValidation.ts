import { CreditCardFormData, CreditCardValidation } from '@/types/creditCard';

export class CreditCardValidationService {
  /**
   * Validates credit card form data
   */
  static validateCreditCard(data: Partial<CreditCardFormData>): CreditCardValidation {
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
