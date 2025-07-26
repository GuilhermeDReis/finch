import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardTotals {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

export function useDashboardTotals(year: number, month: number) {
  const [totals, setTotals] = useState<DashboardTotals>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
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

        if (error) throw error;

        const income = transactions
          ?.filter(t => t.type === 'income')
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        const expenses = transactions
          ?.filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        setTotals({
          totalIncome: income,
          totalExpenses: expenses,
          balance: income - expenses,
        });
      } catch (error) {
        console.error('Error fetching dashboard totals:', error);
        setTotals({
          totalIncome: 0,
          totalExpenses: 0,
          balance: 0,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchTotals();
  }, [year, month]);

  return { totals, loading };
}