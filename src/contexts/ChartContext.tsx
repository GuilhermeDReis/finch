import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { ChartConfig, ChartFormData } from '@/types/chart';
import { getLogger } from '@/utils/logger';

const logger = getLogger('ChartContext');

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
}

interface ChartContextType {
  chartConfigs: ChartConfig[];
  allTransactions: any[];
  allCategories: Category[];
  allSubcategories: any[];
  loading: boolean;
  addChart: (data: ChartFormData & { selectedCategoryForSubcategory?: string }) => Promise<void>;
  updateChart: (id: string, data: ChartFormData & { selectedCategoryForSubcategory?: string }) => Promise<void>;
  removeChart: (id: string) => Promise<void>;
  duplicateChart: (id: string) => Promise<void>;
  reorderCharts: (chartIds: string[]) => Promise<void>;
  refreshData: () => Promise<void>;
}

const ChartContext = createContext<ChartContextType | undefined>(undefined);

export const useCharts = () => {
  const context = useContext(ChartContext);
  if (context === undefined) {
    throw new Error('useCharts must be used within a ChartProvider');
  }
  return context;
};

export const ChartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allSubcategories, setAllSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Load user charts with raw SQL to handle type issues
      const { data: charts, error: chartsError } = await supabase
        .from('user_charts' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true });

      if (chartsError) {
        logger.error('Error loading charts', { error: chartsError });
        toast({
          title: 'Erro ao carregar gráficos',
          description: chartsError.message,
          variant: 'destructive',
        });
      } else {
        // Map the data to ensure correct types
        const typedCharts: ChartConfig[] = (charts || []).map((chart: any) => ({
          ...chart,
          period_months: chart.period_months as any,
          transaction_type: chart.transaction_type || 'expense',
          grouping_type: chart.grouping_type || 'category',
          chart_type: chart.chart_type || 'evolution',
          comparison_type: chart.comparison_type || undefined,
          show_values_on_points: chart.show_values_on_points ?? true,
          show_percentages: chart.show_percentages ?? true,
          show_trend_line: chart.show_trend_line ?? false,
          highlight_min_max: chart.highlight_min_max ?? false,
          visual_options: chart.visual_options || {},
          display_order: chart.display_order || 0
        }));
        setChartConfigs(typedCharts);
      }

      // Load user transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (transactionsError) {
        logger.error('Error loading transactions', { error: transactionsError });
        toast({
          title: 'Erro ao carregar transações',
          description: transactionsError.message,
          variant: 'destructive',
        });
      } else {
        setAllTransactions(transactions || []);
      }

      // Load categories
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (categoriesError) {
        logger.error('Error loading categories', { error: categoriesError });
        toast({
          title: 'Erro ao carregar categorias',
          description: categoriesError.message,
          variant: 'destructive',
        });
      } else {
        setAllCategories(categories || []);
      }

      // Load subcategories
      const { data: subcategories, error: subcategoriesError } = await supabase
        .from('subcategories')
        .select('*')
        .order('name');

      if (subcategoriesError) {
        logger.error('Error loading subcategories', { error: subcategoriesError });
        toast({
          title: 'Erro ao carregar subcategorias',
          description: subcategoriesError.message,
          variant: 'destructive',
        });
      } else {
        setAllSubcategories(subcategories || []);
      }

    } catch (error) {
      logger.error('Error in loadData', { error });
      toast({
        title: 'Erro ao carregar dados',
        description: 'Ocorreu um erro inesperado ao carregar os dados.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addChart = async (data: ChartFormData & { selectedCategoryForSubcategory?: string }) => {
    if (!user) return;

    try {
      // Get the next order position
      const maxOrder = Math.max(...chartConfigs.map(chart => chart.display_order || 0), 0);
      
      const chartData = {
        user_id: user.id,
        name: data.name,
        category_id: data.category_id || null,
        subcategory_id: data.subcategory_id || null,
        monthly_goal: parseFloat(data.monthly_goal.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
        color: data.color,
        period_months: data.period_months,
        transaction_type: data.transaction_type,
        grouping_type: data.grouping_type,
        chart_type: data.chart_type,
        comparison_type: data.comparison_type || null,
        show_values_on_points: data.show_values_on_points,
        show_percentages: data.show_percentages,
        show_trend_line: data.show_trend_line,
        highlight_min_max: data.highlight_min_max,
        visual_options: data.visual_options || {},
        display_order: maxOrder + 1,
      };

      const { data: newChart, error } = await supabase
        .from('user_charts' as any)
        .insert(chartData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const typedChart: ChartConfig = {
        ...(newChart as any),
        period_months: (newChart as any).period_months as any,
        transaction_type: (newChart as any).transaction_type || 'expense',
        grouping_type: (newChart as any).grouping_type || 'category',
        chart_type: (newChart as any).chart_type || 'evolution',
        comparison_type: (newChart as any).comparison_type || undefined,
        show_values_on_points: (newChart as any).show_values_on_points ?? true,
        show_percentages: (newChart as any).show_percentages ?? true,
        show_trend_line: (newChart as any).show_trend_line ?? false,
        highlight_min_max: (newChart as any).highlight_min_max ?? false,
        visual_options: (newChart as any).visual_options || {},
        display_order: (newChart as any).display_order || 0
      };

      setChartConfigs(prev => [typedChart, ...prev]);
      toast({
        title: 'Gráfico criado com sucesso!',
        description: `O gráfico "${data.name}" foi adicionado ao seu dashboard.`,
      });

    } catch (error: any) {
      logger.error('Error adding chart', { error, code: error.code });
      
      if (error.code === '23505') {
        toast({
          title: 'Nome já existe',
          description: 'Já existe um gráfico com este nome. Escolha um nome diferente.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao criar gráfico',
          description: error.message || 'Ocorreu um erro inesperado.',
          variant: 'destructive',
        });
      }
    }
  };

  const updateChart = async (id: string, data: ChartFormData & { selectedCategoryForSubcategory?: string }) => {
    try {
      const updateData = {
        name: data.name,
        category_id: data.category_id || null,
        subcategory_id: data.subcategory_id || null,
        monthly_goal: parseFloat(data.monthly_goal.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
        color: data.color,
        period_months: data.period_months,
        transaction_type: data.transaction_type,
        grouping_type: data.grouping_type,
        chart_type: data.chart_type,
        comparison_type: data.comparison_type || null,
        show_values_on_points: data.show_values_on_points,
        show_percentages: data.show_percentages,
        show_trend_line: data.show_trend_line,
        highlight_min_max: data.highlight_min_max,
        visual_options: data.visual_options || {},
      };

      const { data: updatedChart, error } = await supabase
        .from('user_charts' as any)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const typedChart: ChartConfig = {
        ...(updatedChart as any),
        period_months: (updatedChart as any).period_months as any,
        transaction_type: (updatedChart as any).transaction_type || 'expense',
        grouping_type: (updatedChart as any).grouping_type || 'category',
        chart_type: (updatedChart as any).chart_type || 'evolution',
        comparison_type: (updatedChart as any).comparison_type || undefined,
        show_values_on_points: (updatedChart as any).show_values_on_points ?? true,
        show_percentages: (updatedChart as any).show_percentages ?? true,
        show_trend_line: (updatedChart as any).show_trend_line ?? false,
        highlight_min_max: (updatedChart as any).highlight_min_max ?? false,
        visual_options: (updatedChart as any).visual_options || {}
      };

      setChartConfigs(prev => 
        prev.map(chart => chart.id === id ? typedChart : chart)
      );

      toast({
        title: 'Gráfico atualizado!',
        description: `As alterações no gráfico "${data.name}" foram salvas.`,
      });

    } catch (error: any) {
      logger.error('Error updating chart', { error, code: error.code });
      
      if (error.code === '23505') {
        toast({
          title: 'Nome já existe',
          description: 'Já existe um gráfico com este nome. Escolha um nome diferente.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao atualizar gráfico',
          description: error.message || 'Ocorreu um erro inesperado.',
          variant: 'destructive',
        });
      }
    }
  };

  const removeChart = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_charts')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setChartConfigs(prev => prev.filter(chart => chart.id !== id));
      toast({
        title: 'Gráfico removido',
        description: 'O gráfico foi removido do seu dashboard.',
      });

    } catch (error: any) {
      logger.error('Error removing chart', { error });
      toast({
        title: 'Erro ao remover gráfico',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    }
  };

  const duplicateChart = async (id: string) => {
    if (!user) return;

    try {
      const originalChart = chartConfigs.find(chart => chart.id === id);
      if (!originalChart) return;

      const duplicateData = {
        user_id: user.id,
        name: `Cópia de ${originalChart.name}`,
        category_id: originalChart.category_id,
        monthly_goal: originalChart.monthly_goal,
        color: originalChart.color,
        period_months: originalChart.period_months,
        transaction_type: originalChart.transaction_type,
        grouping_type: originalChart.grouping_type,
      };

      const { data: newChart, error } = await supabase
        .from('user_charts' as any)
        .insert(duplicateData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const typedChart: ChartConfig = {
        ...(newChart as any),
        period_months: (newChart as any).period_months as any,
        transaction_type: (newChart as any).transaction_type || 'expense',
        grouping_type: (newChart as any).grouping_type || 'category',
        chart_type: (newChart as any).chart_type || 'evolution',
        comparison_type: (newChart as any).comparison_type || undefined,
        show_values_on_points: (newChart as any).show_values_on_points ?? true,
        show_percentages: (newChart as any).show_percentages ?? true,
        show_trend_line: (newChart as any).show_trend_line ?? false,
        highlight_min_max: (newChart as any).highlight_min_max ?? false,
        visual_options: (newChart as any).visual_options || {}
      };

      setChartConfigs(prev => [typedChart, ...prev]);
      toast({
        title: 'Gráfico duplicado!',
        description: `Uma cópia do gráfico foi criada com o nome "${duplicateData.name}".`,
      });

    } catch (error: any) {
      logger.error('Error duplicating chart', { error });
      toast({
        title: 'Erro ao duplicar gráfico',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    }
  };

  const reorderCharts = async (chartIds: string[]) => {
    if (!user) return;

    try {
      // Update display_order for each chart
      const updates = chartIds.map((chartId, index) => ({
        id: chartId,
        display_order: index
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('user_charts' as any)
          .update({ display_order: update.display_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      // Update local state to reflect new order
      const reorderedCharts = chartIds.map(id => 
        chartConfigs.find(chart => chart.id === id)!
      ).filter(Boolean);

      setChartConfigs(reorderedCharts);

      toast({
        title: 'Ordem dos gráficos atualizada!',
        description: 'A nova ordem dos gráficos foi salva.',
      });

    } catch (error: any) {
      logger.error('Error reordering charts', { error });
      toast({
        title: 'Erro ao reordenar gráficos',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    }
  };

  const refreshData = async () => {
    await loadData();
  };

  const value = {
    chartConfigs,
    allTransactions,
    allCategories,
    allSubcategories,
    loading,
    addChart,
    updateChart,
    removeChart,
    duplicateChart,
    reorderCharts,
    refreshData,
  };

  return <ChartContext.Provider value={value}>{children}</ChartContext.Provider>;
};