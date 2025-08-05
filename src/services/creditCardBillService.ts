import { supabase } from '@/integrations/supabase/client';
import { CreditCardBill } from '@/types/creditCard';

export class CreditCardBillService {
  /**
   * Calculate current bill for a credit card
   */
  static async calculateCurrentBill(creditCardId: string, userId: string): Promise<CreditCardBill | null> {
    try {
      // Get credit card details
      const { data: creditCard, error: cardError } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('id', creditCardId)
        .eq('user_id', userId)
        .single();

      if (cardError || !creditCard) {
        console.error('Error fetching credit card:', cardError);
        return null;
      }

      // Calculate current billing period
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      const currentDay = currentDate.getDate();

      // Determine the billing period
      let billingStartDate: Date;
      let billingEndDate: Date;
      let dueDate: Date;

      if (currentDay <= creditCard.closing_day) {
        // Current period (previous month's closing to current month's closing)
        billingStartDate = new Date(currentYear, currentMonth - 1, creditCard.closing_day + 1);
        billingEndDate = new Date(currentYear, currentMonth, creditCard.closing_day);
        dueDate = new Date(currentYear, currentMonth, creditCard.due_day);
      } else {
        // Next period (current month's closing to next month's closing)
        billingStartDate = new Date(currentYear, currentMonth, creditCard.closing_day + 1);
        billingEndDate = new Date(currentYear, currentMonth + 1, creditCard.closing_day);
        dueDate = new Date(currentYear, currentMonth + 1, creditCard.due_day);
      }

      // Query transactions for the current billing period
      const { data: transactions, error: transError } = await supabase
        .from('transaction_credit')
        .select('amount')
        .eq('credit_card_id', creditCardId)
        .eq('user_id', userId)
        .gte('date', billingStartDate.toISOString().split('T')[0])
        .lte('date', billingEndDate.toISOString().split('T')[0]);

      if (transError) {
        console.error('Error fetching transactions:', transError);
        return null;
      }

      // Calculate bill totals
      const currentAmount = (transactions || []).reduce((total, transaction) => {
        // Only positive amounts count towards the bill (purchases)
        return total + (transaction.amount > 0 ? transaction.amount : 0);
      }, 0);

      // Calculate total used amount (all open transactions from closing date onwards)
      // Determine the start date for total used calculation
      let totalUsedStartDate: Date;
      
      if (currentDay >= creditCard.closing_day) {
        // We are after the closing day, so get transactions from this month's closing day onwards
        totalUsedStartDate = new Date(currentYear, currentMonth, creditCard.closing_day);
      } else {
        // We are before the closing day, so get transactions from previous month's closing day onwards
        totalUsedStartDate = new Date(currentYear, currentMonth - 1, creditCard.closing_day);
      }

      // Query all open transactions from the closing date onwards
      const { data: openTransactions, error: openTransError } = await supabase
        .from('transaction_credit')
        .select('amount')
        .eq('credit_card_id', creditCardId)
        .eq('user_id', userId)
        .gte('date', totalUsedStartDate.toISOString().split('T')[0]);

      if (openTransError) {
        console.error('Error fetching open transactions:', openTransError);
      }

      // Calculate total used amount (only positive amounts - purchases)
      const totalUsed = (openTransactions || []).reduce((total, transaction) => {
        return total + (transaction.amount > 0 ? transaction.amount : 0);
      }, 0);

      const availableLimit = creditCard.limit_amount - totalUsed;
      const usagePercentage = (totalUsed / creditCard.limit_amount) * 100;

      return {
        credit_card_id: creditCardId,
        current_amount: currentAmount,
        total_used: totalUsed,
        limit_amount: creditCard.limit_amount,
        available_limit: Math.max(0, availableLimit),
        usage_percentage: Math.min(100, Math.max(0, usagePercentage)),
        closing_date: billingEndDate,
        due_date: dueDate,
        transactions_count: transactions?.length || 0,
      };

    } catch (error) {
      console.error('Error calculating credit card bill:', error);
      return null;
    }
  }

  /**
   * Get bills for multiple credit cards
   */
  static async calculateMultipleBills(creditCardIds: string[], userId: string): Promise<CreditCardBill[]> {
    const bills = await Promise.all(
      creditCardIds.map(cardId => this.calculateCurrentBill(cardId, userId))
    );

    return bills.filter((bill): bill is CreditCardBill => bill !== null);
  }

  /**
   * Get the next closing date for a credit card
   */
  static getNextClosingDate(closingDay: number): Date {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();

    if (currentDay <= closingDay) {
      // Next closing is this month
      return new Date(currentYear, currentMonth, closingDay);
    } else {
      // Next closing is next month
      return new Date(currentYear, currentMonth + 1, closingDay);
    }
  }

  /**
   * Get the next due date for a credit card
   */
  static getNextDueDate(closingDay: number, dueDay: number): Date {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();

    if (currentDay <= closingDay) {
      // Due date is this month
      return new Date(currentYear, currentMonth, dueDay);
    } else {
      // Due date is next month
      return new Date(currentYear, currentMonth + 1, dueDay);
    }
  }

  /**
   * Format currency for display
   */
  static formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  /**
   * Get usage status color based on percentage
   */
  static getUsageStatusColor(percentage: number): string {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 50) return 'text-blue-600';
    return 'text-green-600';
  }

  /**
   * Get usage status text based on percentage
   */
  static getUsageStatusText(percentage: number): string {
    if (percentage >= 90) return 'Limite quase esgotado';
    if (percentage >= 70) return 'Uso elevado';
    if (percentage >= 50) return 'Uso moderado';
    return 'Uso baixo';
  }

  /**
   * Calculate days until due date
   */
  static getDaysUntilDue(dueDate: Date): number {
    const today = new Date();
    const timeDiff = dueDate.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }
}
