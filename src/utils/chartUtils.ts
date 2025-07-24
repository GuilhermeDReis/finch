import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ChartDataPoint, ChartStatus, ChartData, ChartConfig } from '@/types/chart';
import type { Transaction } from '@/types/transaction';

export const CHART_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#84CC16', // Lime
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#F43F5E', // Rose
];

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
};

export const formatMonth = (date: Date): string => {
  return format(date, 'MMM/yy', { locale: ptBR });
};

export const calculateGoalStatus = (currentSpent: number, monthlyGoal: number): ChartStatus => {
  if (currentSpent === 0 && monthlyGoal === 0) return 'no-data';
  if (monthlyGoal === 0) return 'no-data';
  
  const percentage = (currentSpent / monthlyGoal) * 100;
  
  if (percentage <= 80) return 'success';
  if (percentage <= 100) return 'warning';
  return 'danger';
};

export const groupTransactionsByMonthAndCategory = (
  transactions: any[],
  categoryId: string,
  periodMonths: number,
  transactionType: 'income' | 'expense' = 'expense',
  groupingType: 'category' | 'subcategory' = 'category'
): ChartDataPoint[] => {
  const now = new Date();
  const months: ChartDataPoint[] = [];
  
  // Generate array of months for the specified period
  for (let i = periodMonths - 1; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    
    // Filter transactions for this month and category/subcategory
    const monthTransactions = transactions.filter(transaction => {
      const transactionDate = typeof transaction.date === 'string' 
        ? parseISO(transaction.date) 
        : transaction.date;
      
      const matchesGroup = groupingType === 'category' 
        ? transaction.category_id === categoryId
        : transaction.subcategory_id === categoryId;
      
      return matchesGroup &&
             transaction.type === transactionType &&
             transactionDate >= monthStart &&
             transactionDate <= monthEnd;
    });
    
    const totalSpent = monthTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    
    months.push({
      month: formatMonth(monthDate),
      totalSpent,
      goal: 0, // Will be set by the calling function
      transactionCount: monthTransactions.length
    });
  }
  
  return months;
};

export const processChartData = (
  config: ChartConfig,
  transactions: any[],
  categoryName: string
): ChartData => {
  const dataPoints = groupTransactionsByMonthAndCategory(
    transactions,
    config.category_id,
    config.period_months,
    config.transaction_type,
    config.grouping_type
  ).map(point => ({
    ...point,
    goal: config.monthly_goal
  }));
  
  // Get current month data
  const currentMonth = dataPoints[dataPoints.length - 1];
  const currentMonthSpent = currentMonth?.totalSpent || 0;
  const currentMonthGoal = config.monthly_goal;
  const percentageOfGoal = currentMonthGoal > 0 ? (currentMonthSpent / currentMonthGoal) * 100 : 0;
  const status = calculateGoalStatus(currentMonthSpent, currentMonthGoal);
  
  return {
    config,
    dataPoints,
    currentMonthSpent,
    currentMonthGoal,
    percentageOfGoal,
    status,
    categoryName
  };
};