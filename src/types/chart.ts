export type ChartType = 'line';
export type ChartPeriod = 6 | 12 | 24;
export type ChartStatus = 'success' | 'warning' | 'danger' | 'no-data';

export interface ChartConfig {
  id: string;
  user_id: string;
  name: string;
  category_id: string;
  monthly_goal: number;
  color: string;
  period_months: ChartPeriod;
  created_at?: string;
  updated_at?: string;
}

export interface ChartDataPoint {
  month: string;
  totalSpent: number;
  goal: number;
  transactionCount: number;
}

export interface ChartData {
  config: ChartConfig;
  dataPoints: ChartDataPoint[];
  currentMonthSpent: number;
  currentMonthGoal: number;
  percentageOfGoal: number;
  status: ChartStatus;
  categoryName: string;
}

export interface ChartFormData {
  name: string;
  category_id: string;
  monthly_goal: string;
  color: string;
  period_months: ChartPeriod;
}