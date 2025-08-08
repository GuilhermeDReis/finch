import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getLogger } from '@/utils/logger';

const logger = getLogger('DashboardTotals');

interface DashboardTotals {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  totalCredit: number;
}

export function useDashboardTotals(year: number, month: number) {
  const [totals, setTotals] = useState<DashboardTotals>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    totalCredit: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTotals() {
      setLoading(true);
      try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('amount, type')
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0]);

        // Fetch credit card transactions for the same period
        const { data: creditTransactions, error: creditError } = await supabase
          .from('transaction_credit')
          .select('amount')
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0])
          .gt('amount', 0); // Only positive amounts (actual expenses, not payments)

        if (error) throw error;
        if (creditError) throw creditError;

        const income = transactions
          ?.filter(t => t.type === 'income')
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        const expenses = transactions
          ?.filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        const credit = creditTransactions
          ?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        setTotals({
          totalIncome: income,
          totalExpenses: expenses,
          balance: income - expenses,
          totalCredit: credit,
        });
      } catch (error) {
        logger.error('Error fetching dashboard totals', { error });
        setTotals({
          totalIncome: 0,
          totalExpenses: 0,
          balance: 0,
          totalCredit: 0,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchTotals();
  }, [year, month]);

  return { totals, loading };
}