import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { useCharts } from '@/contexts/ChartContext';
import { useToast } from '@/hooks/use-toast';
import type { WizardData, ChartFormData } from '@/types/chart';

interface Step4ReviewAndCreateProps {
  wizardData: WizardData;
  onClose: () => void;
}

export default function Step4ReviewAndCreate({ wizardData, onClose }: Step4ReviewAndCreateProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { addChart, allCategories } = useCharts();
  const { toast } = useToast();

  const getChartTypeLabel = () => {
    switch (wizardData.step1.chart_type) {
      case 'evolution':
        return 'Gráfico de Linha (Evolução)';
      case 'distribution':
        return 'Gráfico de Pizza (Distribuição)';
      case 'comparison':
        return 'Gráfico de Barras (Comparação)';
      default:
        return 'Gráfico';
    }
  };

  const getObjectiveLabel = () => {
    const { chart_type } = wizardData.step1;
    const step2 = wizardData.step2;

    switch (chart_type) {
      case 'evolution':
        if (step2.evolution_scope === 'specific_category') {
          return 'Acompanhar gastos de categoria específica';
        } else if (step2.evolution_scope === 'all_categories') {
          return 'Acompanhar gastos totais';
        } else if (step2.evolution_scope === 'specific_subcategory') {
          return 'Acompanhar gastos de subcategoria específica';
        }
        return 'Acompanhar evolução de gastos';
      case 'distribution':
        if (step2.distribution_scope === 'all_categories') {
          return 'Ver distribuição entre todas as categorias';
        } else {
          return 'Ver distribuição dentro de uma categoria';
        }
      case 'comparison':
        if (step2.comparison_type === 'categories_same_period') {
          return 'Comparar categorias no mesmo período';
        } else if (step2.comparison_type === 'category_different_periods') {
          return 'Comparar categoria em períodos diferentes';
        } else if (step2.comparison_type === 'subcategories') {
          return 'Comparar subcategorias';
        }
        return 'Fazer comparação de gastos';
      default:
        return 'Análise de gastos';
    }
  };

  const getCategoryLabel = () => {
    return wizardData.step2.category_id ? 'Alimentação' : 'Todas as categorias';
  };

  const getPeriodLabel = () => {
    const months = wizardData.step2.period_months || 12;
    return `Últimos ${months} meses`;
  };

  const getGoalLabel = () => {
    if (wizardData.step2.has_monthly_goal && wizardData.step2.monthly_goal) {
      return wizardData.step2.monthly_goal;
    }
    return 'Sem meta definida';
  };

  const getColorLabel = () => {
    const colorMap: Record<string, string> = {
      '#3B82F6': 'Azul Profissional',
      '#10B981': 'Verde Crescimento',
      '#EF4444': 'Vermelho Alerta',
      '#F59E0B': 'Amarelo Energia',
      '#8B5CF6': 'Roxo Criativo',
      'rainbow': 'Paleta Colorida'
    };
    return colorMap[wizardData.step3.color] || 'Azul Profissional';
  };

  const validateForm = () => {
    const { step1, step2 } = wizardData;
    
    // Validar nome do gráfico
    if (!wizardData.step3.name?.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, insira um nome para o gráfico.',
        variant: 'destructive',
      });
      return false;
    }

    // Validar meta mensal quando aplicável
    if (step2.has_monthly_goal && (!step2.monthly_goal || parseFloat(step2.monthly_goal.replace(/[^\d,]/g, '').replace(',', '.')) <= 0)) {
      toast({
        title: 'Meta inválida',
        description: 'Por favor, insira uma meta mensal válida.',
        variant: 'destructive',
      });
      return false;
    }

    // Validar categoria/subcategoria baseado no tipo de gráfico
    switch (step1.chart_type) {
      case 'evolution':
        if (step2.evolution_scope === 'specific_category' && !step2.category_id) {
          toast({
            title: 'Categoria obrigatória',
            description: 'Por favor, selecione uma categoria.',
            variant: 'destructive',
          });
          return false;
        }
        if (step2.evolution_scope === 'specific_subcategory' && (!step2.category_id || !step2.subcategory_id)) {
          toast({
            title: 'Categoria e subcategoria obrigatórias',
            description: 'Por favor, selecione uma categoria e subcategoria.',
            variant: 'destructive',
          });
          return false;
        }
        break;
        
      case 'distribution':
        if (step2.distribution_scope === 'within_category' && !step2.category_id) {
          toast({
            title: 'Categoria obrigatória',
            description: 'Por favor, selecione uma categoria.',
            variant: 'destructive',
          });
          return false;
        }
        break;
        
      case 'comparison':
        if ((step2.comparison_type === 'category_different_periods' || 
             step2.comparison_type === 'subcategories') && !step2.category_id) {
          toast({
            title: 'Categoria obrigatória',
            description: 'Por favor, selecione uma categoria.',
            variant: 'destructive',
          });
          return false;
        }
        if (step2.comparison_type === 'subcategories' && !step2.subcategory_id) {
          toast({
            title: 'Subcategoria obrigatória',
            description: 'Por favor, selecione uma subcategoria.',
            variant: 'destructive',
          });
          return false;
        }
        break;
    }

    return true;
  };

  const handleCreateChart = async () => {
    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    
    try {
      // Convert wizard data to ChartFormData
      let category_id = null;
      let subcategory_id = null;
      let grouping_type: 'category' | 'subcategory' = 'category';

      // Determinar os campos corretos baseado no tipo de gráfico
      switch (wizardData.step1.chart_type) {
        case 'evolution':
          if (wizardData.step2.evolution_scope === 'specific_subcategory') {
            grouping_type = 'subcategory';
            subcategory_id = wizardData.step2.subcategory_id;
            category_id = wizardData.step2.category_id;
          } else if (wizardData.step2.evolution_scope === 'specific_category') {
            grouping_type = 'category';
            category_id = wizardData.step2.category_id;
          } else {
            // Para 'all_categories', usar a primeira categoria disponível como placeholder
            grouping_type = 'category';
            category_id = allCategories.find(cat => cat.type === 'expense')?.id || null;
          }
          break;
          
        case 'distribution':
          if (wizardData.step2.distribution_scope === 'within_category') {
            grouping_type = 'category'; // Usar category para evitar constraint, mas filtrar subcategorias depois
            category_id = wizardData.step2.category_id;
            subcategory_id = null;
          } else {
            // Para 'all_categories', mostrar todas as categorias
            grouping_type = 'category';
            category_id = null; // null indica que deve mostrar todas as categorias
          }
          break;
          
        case 'comparison':
          if (wizardData.step2.comparison_type === 'subcategories') {
            grouping_type = 'subcategory';
            subcategory_id = wizardData.step2.subcategory_id;
            category_id = wizardData.step2.category_id;
          } else if (wizardData.step2.comparison_type === 'category_different_periods') {
            grouping_type = 'category';
            category_id = wizardData.step2.category_id;
          } else {
            // Para 'categories_same_period', usar a primeira categoria como placeholder
            grouping_type = 'category';
            category_id = allCategories.find(cat => cat.type === 'expense')?.id || null;
          }
          break;
      }

      // Garantir que sempre temos um category_id válido, exceto para distribution com all_categories
      if (!category_id && !(wizardData.step1.chart_type === 'distribution' && wizardData.step2.distribution_scope === 'all_categories')) {
        const firstCategory = allCategories.find(cat => cat.type === 'expense');
        if (firstCategory) {
          category_id = firstCategory.id;
        } else {
          throw new Error('Nenhuma categoria de despesa encontrada. Por favor, crie uma categoria primeiro.');
        }
      }

      const chartData: ChartFormData = {
        name: wizardData.step3.name.trim(),
        category_id: category_id,
        subcategory_id: subcategory_id || undefined, // Ensure it's undefined instead of null to avoid foreign key issues
        monthly_goal: wizardData.step2.monthly_goal || '0',
        color: wizardData.step3.color === 'rainbow' ? '#3B82F6' : wizardData.step3.color,
        period_months: wizardData.step2.period_months || 12,
        transaction_type: 'expense',
        grouping_type: grouping_type,
        chart_type: wizardData.step1.chart_type,
        comparison_type: wizardData.step2.comparison_type || undefined,
        show_values_on_points: wizardData.step3.show_values_on_points || false,
        show_percentages: wizardData.step3.show_percentages || false,
        show_trend_line: wizardData.step3.show_trend_line || false,
        highlight_min_max: wizardData.step3.highlight_min_max || false,
        visual_options: {}
      };

      await addChart({
        ...chartData,
        selectedCategoryForSubcategory: category_id
      });
      onClose();
      
    } catch (err: any) {
      // console.error('Error creating chart:', err);
      toast({
        title: 'Erro ao criar gráfico',
        description: err.message || 'Ocorreu um erro ao criar o gráfico. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold mb-2">🎉 Quase pronto! Revise as configurações:</h2>
        <p className="text-sm text-muted-foreground">
          Confira todos os detalhes antes de criar seu gráfico
        </p>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumo do Gráfico</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground">📊 Tipo:</span>
            <Badge variant="secondary" className="text-sm">{getChartTypeLabel()}</Badge>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground">🎯 Objetivo:</span>
            <span className="text-right max-w-xs">{getObjectiveLabel()}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground">📂 Categoria:</span>
            <span>{getCategoryLabel()}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground">🎨 Nome:</span>
            <span className="font-medium text-right max-w-xs">"{wizardData.step3.name || 'Evolução dos Gastos com Alimentação'}"</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground">📅 Período:</span>
            <span>{getPeriodLabel()}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground">🎯 Meta:</span>
            <span>{getGoalLabel()}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground">🎨 Cor:</span>
            <span>{getColorLabel()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
          className="flex items-center gap-2 h-12 px-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </Button>
        <Button
          type="button"
          onClick={handleCreateChart}
          disabled={isCreating}
          className="flex items-center gap-2 h-12 px-6 text-base"
        >
          {isCreating ? 'Criando...' : 'Criar Gráfico'}
          <Sparkles className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
