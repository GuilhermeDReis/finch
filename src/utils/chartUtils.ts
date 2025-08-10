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

export const groupAllTransactionsByMonth = (
  transactions: any[],
  periodMonths: number,
  transactionType: 'income' | 'expense' = 'expense',
  selectedYear?: number,
  selectedMonth?: number
): ChartDataPoint[] => {
  // Use selected date from dashboard or current date as fallback
  const now = selectedYear && selectedMonth 
    ? new Date(selectedYear, selectedMonth - 1, 1)
    : new Date();
  const months: ChartDataPoint[] = [];
  
  // Generate array of months for the specified period
  for (let i = periodMonths - 1; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    
    // Filter transactions for this month (all categories)
    const monthTransactions = transactions.filter(transaction => {
      const transactionDate = typeof transaction.date === 'string' 
        ? parseISO(transaction.date) 
        : transaction.date;
      
      return transaction.type === transactionType &&
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

export const groupTransactionsByMonthAndCategory = (
  transactions: any[],
  categoryId: string,
  periodMonths: number,
  transactionType: 'income' | 'expense' = 'expense',
  groupingType: 'category' | 'subcategory' = 'category',
  selectedYear?: number,
  selectedMonth?: number
): ChartDataPoint[] => {
  // Use selected date from dashboard or current date as fallback
  const now = selectedYear && selectedMonth 
    ? new Date(selectedYear, selectedMonth - 1, 1)
    : new Date();
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
  categoryName: string,
  allSubcategories?: any[],
  selectedYear?: number,
  selectedMonth?: number
): ChartData => {
  // Handle different chart types
  switch (config.chart_type) {
    case 'evolution':
      return processEvolutionChartData(config, transactions, categoryName, selectedYear, selectedMonth);
    case 'distribution':
      return processDistributionChartData(config, transactions, categoryName, selectedYear, selectedMonth);
    case 'comparison':
      return processComparisonChartData(config, transactions, categoryName, allSubcategories, selectedYear, selectedMonth);
    default:
      return processEvolutionChartData(config, transactions, categoryName, selectedYear, selectedMonth);
  }
};

export const processEvolutionChartData = (
  config: ChartConfig,
  transactions: any[],
  categoryName: string,
  selectedYear?: number,
  selectedMonth?: number
): ChartData => {
  let dataPoints: ChartDataPoint[];
  
  // Check if we should consider all categories (when category_id is null)
  if (!config.category_id) {
    // For "all categories", we sum all transactions by month regardless of category
    dataPoints = groupAllTransactionsByMonth(
      transactions,
      config.period_months,
      config.transaction_type,
      selectedYear,
      selectedMonth
    ).map(point => ({
      ...point,
      goal: config.monthly_goal
    }));
  } else {
    // For specific category or subcategory
    const targetId = config.grouping_type === 'subcategory' ? config.subcategory_id : config.category_id;
    dataPoints = groupTransactionsByMonthAndCategory(
      transactions,
      targetId,
      config.period_months,
      config.transaction_type,
      config.grouping_type,
      selectedYear,
      selectedMonth
    ).map(point => ({
      ...point,
      goal: config.monthly_goal
    }));
  }
  
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

export const processDistributionChartData = (
  config: ChartConfig,
  transactions: any[],
  categoryName: string,
  selectedYear?: number,
  selectedMonth?: number
): ChartData => {
  // For distribution charts (pie charts), ALWAYS use only the specific month selected in dashboard
  // Use selected date from dashboard or current date as fallback
  const currentDate = selectedYear && selectedMonth 
    ? new Date(selectedYear, selectedMonth - 1, 1)
    : new Date();
  
  // ALWAYS use only the specific month from dashboard for distribution charts
  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(currentDate);
  
  // Filter transactions ONLY for the selected month and transaction type
  let periodTransactions = transactions.filter(transaction => {
    const transactionDate = typeof transaction.date === 'string' 
      ? parseISO(transaction.date) 
      : transaction.date;
    return transactionDate >= startDate && transactionDate <= endDate && transaction.type === config.transaction_type;
  });

  // Apply category filter based on the configuration
  if (config.category_id) {
    // When a category is specified, filter transactions by that category
    periodTransactions = periodTransactions.filter(transaction => 
      transaction.category_id === config.category_id
    );
  }

  // Group by categories or subcategories based on the context
  const groupedData: { [key: string]: number } = {};
  
  periodTransactions.forEach(transaction => {
    let key: string;
    
    if (config.category_id) {
      // When a category is specified, group by subcategories
      key = transaction.subcategory_id || 'Sem subcategoria';
    } else {
      // When no category is specified, group by categories
      key = transaction.category_id || 'Sem categoria';
    }
    
    if (key) {
      groupedData[key] = (groupedData[key] || 0) + Number(transaction.amount);
    }
  });

  // Convert to data points format
  const total = Object.values(groupedData).reduce((sum, value) => sum + value, 0);
  const dataPoints = Object.entries(groupedData).map(([key, value]) => ({
    month: key, // Using key as identifier
    totalSpent: value,
    goal: 0,
    transactionCount: periodTransactions.filter(t => 
      (config.category_id ? t.subcategory_id : t.category_id) === key
    ).length,
    percentage: total > 0 ? (value / total) * 100 : 0
  }));

  return {
    config,
    dataPoints,
    currentMonthSpent: total,
    currentMonthGoal: config.monthly_goal,
    percentageOfGoal: config.monthly_goal > 0 ? (total / config.monthly_goal) * 100 : 0,
    status: calculateGoalStatus(total, config.monthly_goal),
    categoryName
  };
};

export const processComparisonChartData = (
  config: ChartConfig,
  transactions: any[],
  categoryName: string,
  allSubcategories?: any[],
  selectedYear?: number,
  selectedMonth?: number
): ChartData => {
  // For comparison charts, the logic depends on comparison_type
  switch (config.comparison_type) {
    case 'categories_same_period':
      return processComparisonCategoriesSamePeriod(config, transactions, categoryName, selectedYear, selectedMonth);
    case 'category_different_periods':
      return processComparisonCategoryDifferentPeriods(config, transactions, categoryName, selectedYear, selectedMonth);
    case 'subcategories':
      return processComparisonSubcategories(config, transactions, categoryName, allSubcategories, selectedYear, selectedMonth);
    default:
      return processEvolutionChartData(config, transactions, categoryName, selectedYear, selectedMonth);
  }
};

const processComparisonCategoriesSamePeriod = (
  config: ChartConfig,
  transactions: any[],
  categoryName: string,
  selectedYear?: number,
  selectedMonth?: number
): ChartData => {
  // For comparison charts, ALWAYS use only the specific month selected in dashboard
  const currentDate = selectedYear && selectedMonth 
    ? new Date(selectedYear, selectedMonth - 1, 1)
    : new Date();
  
  // ALWAYS use only the specific month from dashboard for comparison charts
  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(currentDate);
  
  // Filter transactions ONLY for the selected month
  const periodTransactions = transactions.filter(transaction => {
    const transactionDate = typeof transaction.date === 'string' 
      ? parseISO(transaction.date) 
      : transaction.date;
    return transactionDate >= startDate && transactionDate <= endDate && transaction.type === config.transaction_type;
  });

  // Group by categories
  const categoryTotals: { [key: string]: number } = {};
  periodTransactions.forEach(transaction => {
    const categoryId = transaction.category_id;
    if (categoryId) {
      categoryTotals[categoryId] = (categoryTotals[categoryId] || 0) + Number(transaction.amount);
    }
  });

  // Convert to data points
  const dataPoints = Object.entries(categoryTotals).map(([categoryId, total]) => ({
    month: categoryId,
    totalSpent: total,
    goal: config.monthly_goal,
    transactionCount: periodTransactions.filter(t => t.category_id === categoryId).length
  }));

  const totalSpent = Object.values(categoryTotals).reduce((sum, value) => sum + value, 0);

  return {
    config,
    dataPoints,
    currentMonthSpent: totalSpent,
    currentMonthGoal: config.monthly_goal,
    percentageOfGoal: config.monthly_goal > 0 ? (totalSpent / config.monthly_goal) * 100 : 0,
    status: calculateGoalStatus(totalSpent, config.monthly_goal),
    categoryName
  };
};

const processComparisonCategoryDifferentPeriods = (
  config: ChartConfig,
  transactions: any[],
  categoryName: string,
  selectedYear?: number,
  selectedMonth?: number
): ChartData => {
  // This is similar to evolution but for a specific category across different periods
  const dataPoints = groupTransactionsByMonthAndCategory(
    transactions,
    config.category_id,
    config.period_months,
    config.transaction_type,
    config.grouping_type,
    selectedYear,
    selectedMonth
  ).map(point => ({
    ...point,
    goal: config.monthly_goal
  }));

  const currentMonth = dataPoints[dataPoints.length - 1];
  const currentMonthSpent = currentMonth?.totalSpent || 0;

  return {
    config,
    dataPoints,
    currentMonthSpent,
    currentMonthGoal: config.monthly_goal,
    percentageOfGoal: config.monthly_goal > 0 ? (currentMonthSpent / config.monthly_goal) * 100 : 0,
    status: calculateGoalStatus(currentMonthSpent, config.monthly_goal),
    categoryName
  };
};

const processComparisonSubcategories = (
  config: ChartConfig,
  transactions: any[],
  categoryName: string,
  allSubcategories?: any[],
  selectedYear?: number,
  selectedMonth?: number
): ChartData => {
  // Para gráficos de subcategorias, SEMPRE usar apenas o mês selecionado no dashboard
  // Independente da configuração de period_months
  const currentDate = selectedYear && selectedMonth 
    ? new Date(selectedYear, selectedMonth - 1, 1)
    : new Date();
  
  // SEMPRE usar apenas o mês específico do dashboard para subcategorias
  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(currentDate);
  
  // Filter transactions ONLY for the selected month and category
  const periodTransactions = transactions.filter(transaction => {
    const transactionDate = typeof transaction.date === 'string' 
      ? parseISO(transaction.date) 
      : transaction.date;
    return transactionDate >= startDate && transactionDate <= endDate && 
           transaction.type === config.transaction_type &&
           transaction.category_id === config.category_id;
  });

  // Group by subcategories
  const subcategoryTotals: { [key: string]: number } = {};
  periodTransactions.forEach(transaction => {
    const subcategoryId = transaction.subcategory_id;
    if (subcategoryId) {
      subcategoryTotals[subcategoryId] = (subcategoryTotals[subcategoryId] || 0) + Number(transaction.amount);
    }
  });

  // Helper function to get subcategory name
  const getSubcategoryName = (subcategoryId: string): string => {
    if (!allSubcategories) return subcategoryId;
    const subcategory = allSubcategories.find(sub => sub.id === subcategoryId);
    return subcategory ? subcategory.name : subcategoryId;
  };

  // Convert to data points
  const dataPoints = Object.entries(subcategoryTotals).map(([subcategoryId, total]) => ({
    month: getSubcategoryName(subcategoryId),
    totalSpent: total,
    goal: config.monthly_goal,
    transactionCount: periodTransactions.filter(t => t.subcategory_id === subcategoryId).length
  }));

  const totalSpent = Object.values(subcategoryTotals).reduce((sum, value) => sum + value, 0);

  return {
    config,
    dataPoints,
    currentMonthSpent: totalSpent,
    currentMonthGoal: config.monthly_goal,
    percentageOfGoal: config.monthly_goal > 0 ? (totalSpent / config.monthly_goal) * 100 : 0,
    status: calculateGoalStatus(totalSpent, config.monthly_goal),
    categoryName
  };
};
