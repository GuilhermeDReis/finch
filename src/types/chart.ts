export type ChartType = 'evolution' | 'distribution' | 'comparison';
export type ChartPeriod = 3 | 6 | 12 | 24;
export type ChartStatus = 'success' | 'warning' | 'danger' | 'no-data';
export type TransactionType = 'income' | 'expense';
export type GroupingType = 'category' | 'subcategory';
export type ComparisonType = 'categories_same_period' | 'category_different_periods' | 'subcategories';

export interface ChartConfig {
  id: string;
  user_id: string;
  name: string;
  category_id: string;
  subcategory_id?: string;
  monthly_goal: number;
  color: string;
  period_months: ChartPeriod;
  transaction_type: TransactionType;
  grouping_type: GroupingType;
  chart_type: ChartType;
  comparison_type?: ComparisonType;
  show_values_on_points: boolean;
  show_percentages: boolean;
  show_trend_line: boolean;
  highlight_min_max: boolean;
  visual_options: Record<string, any>;
  display_order: number;
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
  subcategory_id?: string;
  monthly_goal: string;
  color: string;
  period_months: ChartPeriod;
  transaction_type: TransactionType;
  grouping_type: GroupingType;
  chart_type: ChartType;
  comparison_type?: ComparisonType;
  show_values_on_points: boolean;
  show_percentages: boolean;
  show_trend_line: boolean;
  highlight_min_max: boolean;
  visual_options: Record<string, any>;
}

// Wizard step data interfaces
export interface WizardStep1Data {
  chart_type: ChartType;
}

export interface WizardStep2Data {
  // Evolution specific
  evolution_scope?: 'specific_category' | 'all_categories' | 'specific_subcategory';
  category_id?: string;
  subcategory_id?: string;
  has_monthly_goal?: boolean;
  monthly_goal?: string;
  period_months?: ChartPeriod;
  
  // Distribution specific
  distribution_scope?: 'all_categories' | 'within_category';
  
  // Comparison specific
  comparison_type?: ComparisonType;
  include_goal_reference?: boolean;
}

export interface WizardStep3Data {
  name: string;
  color: string;
  show_values_on_points: boolean;
  show_percentages: boolean;
  show_trend_line: boolean;
  highlight_min_max: boolean;
}

export interface WizardData {
  step1: WizardStep1Data;
  step2: WizardStep2Data;
  step3: WizardStep3Data;
}

// Chart type definitions for UI
export interface ChartTypeOption {
  id: ChartType;
  title: string;
  subtitle: string;
  benefits: string[];
  icon: string;
}
