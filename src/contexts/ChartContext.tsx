import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { ChartConfig, ChartFormData } from '@/types/chart';
import type { Tables } from '@/integrations/supabase/types';

type Transaction = Tables<'transactions'>;
type Category = Tables<'categories'>;
type Subcategory = Tables<'subcategories'>;

interface ChartContextType {
  chartConfigs: ChartConfig[];
  allTransactions: Transaction[];
  allCategories: Category[];
  allSubcategories: Subcategory[];
  loading: boolean;
  addChart: (data: ChartFormData) => Promise<void>;
  updateChart: (id: string, data: ChartFormData) => Promise<void>;
  removeChart: (id: string) => Promise<void>;
  duplicateChart: (id: string) => Promise<void>;
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
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allSubcategories, setAllSubcategories] = useState<Subcategory[]>([]);
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
        .order('created_at', { ascending: false });

      if (chartsError) {
        console.error('Error loading charts:', chartsError);
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
          grouping_type: chart.grouping_type || 'category'
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
        console.error('Error loading transactions:', transactionsError);
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
        console.error('Error loading categories:', categoriesError);
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
        console.error('Error loading subcategories:', subcategoriesError);
        toast({
          title: 'Erro ao carregar subcategorias',
          description: subcategoriesError.message,
          variant: 'destructive',
        });
      } else {
        setAllSubcategories(subcategories || []);
      }

    } catch (error) {
      console.error('Error in loadData:', error);
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

  const addChart = async (data: ChartFormData) => {
    if (!user) return;

    try {
      console.log('🚀 AddChart - Form Data:', data);
      
      // Prepare chart data based on grouping type
      let chartData;
      
      if (data.grouping_type === 'subcategory') {
        // When grouping by subcategory, data.category_id is actually a subcategory ID
        const selectedSubcategory = allSubcategories.find(sub => sub.id === data.category_id);
        if (!selectedSubcategory) {
          throw new Error('Subcategoria selecionada não encontrada');
        }
        
        chartData = {
          user_id: user.id,
          name: data.name,
          category_id: selectedSubcategory.category_id, // Parent category ID
          subcategory_id: selectedSubcategory.id, // Subcategory ID
          monthly_goal: parseFloat(data.monthly_goal.replace(/[^\d,]/g, '').replace(',', '.')),
          color: data.color,
          period_months: data.period_months,
          transaction_type: data.transaction_type,
          grouping_type: data.grouping_type,
        };
        
        console.log('🚀 Subcategory grouping - Parent category:', selectedSubcategory.category_id);
        console.log('🚀 Subcategory grouping - Subcategory:', selectedSubcategory.id);
      } else {
        // When grouping by category, verify the category exists
        const selectedCategory = allCategories.find(cat => cat.id === data.category_id);
        if (!selectedCategory) {
          throw new Error('Categoria selecionada não encontrada');
        }
        
        chartData = {
          user_id: user.id,
          name: data.name,
          category_id: data.category_id, // Category ID
          subcategory_id: null, // No subcategory for category grouping
          monthly_goal: parseFloat(data.monthly_goal.replace(/[^\d,]/g, '').replace(',', '.')),
          color: data.color,
          period_months: data.period_months,
          transaction_type: data.transaction_type,
          grouping_type: data.grouping_type,
        };
        
        console.log('🚀 Category grouping - Category:', data.category_id);
      }
      
      console.log('🚀 AddChart - Chart Data to Insert:', chartData);

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
        grouping_type: (newChart as any).grouping_type || 'category'
      };

      setChartConfigs(prev => [typedChart, ...prev]);
      toast({
        title: 'Gráfico criado com sucesso!',
        description: `O gráfico "${data.name}" foi adicionado ao seu dashboard.`,
      });

    } catch (error: unknown) {
      console.error('Error adding chart:', error);
      
      const errorObj = error as { code?: string; message?: string };
      if (errorObj.code === '23505') {
        toast({
          title: 'Nome já existe',
          description: 'Já existe um gráfico com este nome. Escolha um nome diferente.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao criar gráfico',
          description: errorObj.message || 'Ocorreu um erro inesperado.',
          variant: 'destructive',
        });
      }
    }
  };

  const updateChart = async (id: string, data: ChartFormData) => {
    try {
      // Prepare update data based on grouping type (same logic as addChart)
      let updateData;
      
      if (data.grouping_type === 'subcategory') {
        const selectedSubcategory = allSubcategories.find(sub => sub.id === data.category_id);
        if (!selectedSubcategory) {
          throw new Error('Subcategoria selecionada não encontrada');
        }
        
        updateData = {
          name: data.name,
          category_id: selectedSubcategory.category_id,
          subcategory_id: selectedSubcategory.id,
          monthly_goal: parseFloat(data.monthly_goal.replace(/[^\d,]/g, '').replace(',', '.')),
          color: data.color,
          period_months: data.period_months,
          transaction_type: data.transaction_type,
          grouping_type: data.grouping_type,
        };
      } else {
        const selectedCategory = allCategories.find(cat => cat.id === data.category_id);
        if (!selectedCategory) {
          throw new Error('Categoria selecionada não encontrada');
        }
        
        updateData = {
          name: data.name,
          category_id: data.category_id,
          subcategory_id: null,
          monthly_goal: parseFloat(data.monthly_goal.replace(/[^\d,]/g, '').replace(',', '.')),
          color: data.color,
          period_months: data.period_months,
          transaction_type: data.transaction_type,
          grouping_type: data.grouping_type,
        };
      }

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
        grouping_type: (updatedChart as any).grouping_type || 'category'
      };

      setChartConfigs(prev => 
        prev.map(chart => chart.id === id ? typedChart : chart)
      );

      toast({
        title: 'Gráfico atualizado!',
        description: `As alterações no gráfico "${data.name}" foram salvas.`,
      });

    } catch (error: unknown) {
      console.error('Error updating chart:', error);
      
      const errorObj = error as { code?: string; message?: string };
      if (errorObj.code === '23505') {
        toast({
          title: 'Nome já existe',
          description: 'Já existe um gráfico com este nome. Escolha um nome diferente.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao atualizar gráfico',
          description: errorObj.message || 'Ocorreu um erro inesperado.',
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

    } catch (error: unknown) {
      console.error('Error removing chart:', error);
      const errorObj = error as { message?: string };
      toast({
        title: 'Erro ao remover gráfico',
        description: errorObj.message || 'Ocorreu um erro inesperado.',
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
        grouping_type: (newChart as any).grouping_type || 'category'
      };

      setChartConfigs(prev => [typedChart, ...prev]);
      toast({
        title: 'Gráfico duplicado!',
        description: `Uma cópia do gráfico foi criada com o nome "${duplicateData.name}".`,
      });

    } catch (error: unknown) {
      console.error('Error duplicating chart:', error);
      const errorObj = error as { message?: string };
      toast({
        title: 'Erro ao duplicar gráfico',
        description: errorObj.message || 'Ocorreu um erro inesperado.',
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
    refreshData,
  };

  return <ChartContext.Provider value={value}>{children}</ChartContext.Provider>;
};