import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { TrendingUp, PieChart, BarChart3 } from 'lucide-react';
import { useCharts } from '@/contexts/ChartContext';
import { formatCurrency } from '@/utils/chartUtils';
import type { WizardStep2Data, ChartType, ChartPeriod } from '@/types/chart';

interface Step2DataConfigurationProps {
  chartType: ChartType;
  data: WizardStep2Data;
  onUpdate: (data: WizardStep2Data) => void;
}

export default function Step2DataConfiguration({ chartType, data, onUpdate }: Step2DataConfigurationProps) {
  const { allCategories, allSubcategories } = useCharts();
  const [formData, setFormData] = useState<WizardStep2Data>(data);

  const updateFormData = (updates: Partial<WizardStep2Data>) => {
    const newData = { ...formData, ...updates };
    setFormData(newData);
    onUpdate(newData);
  };

  const handleGoalChange = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    if (!numericValue) {
      updateFormData({ monthly_goal: '' });
      return;
    }
    
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseInt(numericValue));
    
    updateFormData({ monthly_goal: formatted });
  };

  const getChartIcon = () => {
    switch (chartType) {
      case 'evolution':
        return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'distribution':
        return <PieChart className="w-5 h-5 text-green-500" />;
      case 'comparison':
        return <BarChart3 className="w-5 h-5 text-purple-500" />;
    }
  };

  const getChartTitle = () => {
    switch (chartType) {
      case 'evolution':
        return 'Acompanhar Evolução';
      case 'distribution':
        return 'Ver Distribuição';
      case 'comparison':
        return 'Fazer Comparação';
    }
  };

  const renderEvolutionConfig = () => (
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <Label className="text-base font-semibold mb-4 block">O que você quer acompanhar?</Label>
        <RadioGroup
          value={formData.evolution_scope || 'specific_category'}
          onValueChange={(value) => updateFormData({ evolution_scope: value as any })}
          className="space-y-4"
        >
          <div className="flex items-start space-x-4">
            <RadioGroupItem value="specific_category" id="specific_category" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="specific_category" className="font-medium text-base">Uma categoria específica</Label>
              <p className="text-sm text-muted-foreground mt-1">Ex: "Meus gastos com alimentação"</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <RadioGroupItem value="all_categories" id="all_categories" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="all_categories" className="font-medium text-base">Todas as categorias juntas</Label>
              <p className="text-sm text-muted-foreground mt-1">Ex: "Meus gastos totais"</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <RadioGroupItem value="specific_subcategory" id="specific_subcategory" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="specific_subcategory" className="font-medium text-base">Uma subcategoria específica</Label>
              <p className="text-sm text-muted-foreground mt-1">Ex: "Quanto gasto com delivery"</p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {(formData.evolution_scope === 'specific_category' || formData.evolution_scope === 'specific_subcategory') && (
        <div className="space-y-6">
          <div>
            <Label className="text-base font-medium mb-3 block">Categoria</Label>
            <Select 
              value={formData.category_id || ''} 
              onValueChange={(value) => updateFormData({ category_id: value })}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {allCategories.filter(cat => cat.type === 'expense').map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.evolution_scope === 'specific_subcategory' && formData.category_id && (
            <div>
              <Label className="text-base font-medium mb-3 block">Subcategoria</Label>
              <Select 
                value={formData.subcategory_id || ''} 
                onValueChange={(value) => updateFormData({ subcategory_id: value })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecione uma subcategoria" />
                </SelectTrigger>
                <SelectContent>
                  {allSubcategories
                    .filter(sub => sub.category_id === formData.category_id)
                    .map((subcategory) => (
                      <SelectItem key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        <Label className="text-lg font-semibold">Definir meta mensal?</Label>
        <RadioGroup
          value={formData.has_monthly_goal ? 'yes' : 'no'}
          onValueChange={(value) => updateFormData({ has_monthly_goal: value === 'yes' })}
          className="flex space-x-8"
        >
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="yes" id="goal_yes" />
            <Label htmlFor="goal_yes" className="text-base">Sim, quero acompanhar meta</Label>
          </div>
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="no" id="goal_no" />
            <Label htmlFor="goal_no" className="text-base">Não, só ver evolução</Label>
          </div>
        </RadioGroup>

        {formData.has_monthly_goal && (
          <div>
            <Label className="text-base font-medium mb-3 block">Meta Mensal</Label>
            <Input
              type="text"
              value={formData.monthly_goal || ''}
              onChange={(e) => handleGoalChange(e.target.value)}
              placeholder="R$ 800,00"
              className="h-12 text-base"
            />
          </div>
        )}
      </div>

      <div>
        <Label className="text-base font-medium mb-3 block">Período para análise</Label>
        <Select 
          value={formData.period_months?.toString() || '12'} 
          onValueChange={(value) => updateFormData({ period_months: parseInt(value) as ChartPeriod })}
        >
          <SelectTrigger className="h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Últimos 3 meses</SelectItem>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
            <SelectItem value="12">Últimos 12 meses</SelectItem>
            <SelectItem value="24">Últimos 24 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.has_monthly_goal && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <span className="text-blue-500 text-lg">💡</span>
            <p className="text-blue-700">
              Com meta definida, você verá uma linha pontilhada mostrando seu objetivo!
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderDistributionConfig = () => (
    <div className="space-y-6">
      <div className="border rounded-lg p-4">
        <Label className="text-base font-medium mb-4 block">Que distribuição você quer ver?</Label>
        <RadioGroup
          value={formData.distribution_scope || 'all_categories'}
          onValueChange={(value) => updateFormData({ distribution_scope: value as any })}
          className="space-y-4"
        >
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="all_categories" id="all_categories_dist" className="mt-1" />
            <div>
              <Label htmlFor="all_categories_dist" className="font-medium">Entre todas as categorias</Label>
              <p className="text-sm text-muted-foreground">Ex: "Alimentação vs Transporte vs..."</p>
              <p className="text-sm text-muted-foreground">📊 Visão geral dos seus gastos</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="within_category" id="within_category" className="mt-1" />
            <div>
              <Label htmlFor="within_category" className="font-medium">Dentro de uma categoria específica</Label>
              <p className="text-sm text-muted-foreground">Ex: "Delivery vs Restaurante vs..."</p>
              <p className="text-sm text-muted-foreground">🔍 Análise detalhada de uma área</p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {formData.distribution_scope === 'within_category' && (
        <div className="border rounded-lg p-4">
          <div className="space-y-4">
            <div>
              <Label>Qual categoria analisar?</Label>
              <Select 
                value={formData.category_id || ''} 
                onValueChange={(value) => updateFormData({ category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.filter(cat => cat.type === 'expense').map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.category_id && (
              <div>
                <Label className="text-sm font-medium">Subcategorias encontradas:</Label>
                <div className="mt-2 space-y-1">
                  {allSubcategories
                    .filter(sub => sub.category_id === formData.category_id)
                    .slice(0, 4)
                    .map((subcategory) => (
                      <div key={subcategory.id} className="text-sm text-muted-foreground">
                        • {subcategory.name} (R$ 450)
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <Label>Período para análise</Label>
        <Select 
          value={formData.period_months?.toString() || '6'} 
          onValueChange={(value) => updateFormData({ period_months: parseInt(value) as ChartPeriod })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Últimos 3 meses</SelectItem>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
            <SelectItem value="12">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <span className="text-blue-500">💡</span>
          <p className="text-sm text-blue-700">
            Pizza funciona melhor com 3+ categorias com valores significativos!
          </p>
        </div>
      </div>
    </div>
  );

  const renderComparisonConfig = () => (
    <div className="space-y-6">
      <div className="border rounded-lg p-4">
        <Label className="text-base font-medium mb-4 block">O que você quer comparar?</Label>
        <RadioGroup
          value={formData.comparison_type || 'categories_same_period'}
          onValueChange={(value) => updateFormData({ comparison_type: value as any })}
          className="space-y-4"
        >
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="categories_same_period" id="categories_same" className="mt-1" />
            <div>
              <Label htmlFor="categories_same" className="font-medium">Categorias no mesmo período</Label>
              <p className="text-sm text-muted-foreground">Ex: "Alimentação vs Transporte"</p>
              <p className="text-sm text-muted-foreground">📊 Qual categoria gasta mais?</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="category_different_periods" id="category_periods" className="mt-1" />
            <div>
              <Label htmlFor="category_periods" className="font-medium">Mesma categoria em períodos diferentes</Label>
              <p className="text-sm text-muted-foreground">Ex: "Alimentação: Jan vs Fev vs Mar"</p>
              <p className="text-sm text-muted-foreground">📈 Como evoluiu ao longo do tempo?</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="subcategories" id="subcategories_comp" className="mt-1" />
            <div>
              <Label htmlFor="subcategories_comp" className="font-medium">Subcategorias de uma categoria</Label>
              <p className="text-sm text-muted-foreground">Ex: "Delivery vs Restaurante"</p>
              <p className="text-sm text-muted-foreground">🔍 Detalhamento de uma área</p>
            </div>
          </div>
        </RadioGroup>
      </div>

      <div className="border rounded-lg p-4">
        <div className="space-y-4">
          {(formData.comparison_type === 'category_different_periods' || formData.comparison_type === 'subcategories') && (
            <div>
              <Label>Categoria {formData.comparison_type === 'subcategories' ? '' : '(se aplicável)'}</Label>
              <Select 
                value={formData.category_id || ''} 
                onValueChange={(value) => updateFormData({ category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.filter(cat => cat.type === 'expense').map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Período</Label>
            <Select 
              value={formData.period_months?.toString() || '6'} 
              onValueChange={(value) => updateFormData({ period_months: parseInt(value) as ChartPeriod })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Últimos 3 meses</SelectItem>
                <SelectItem value="6">Últimos 6 meses</SelectItem>
                <SelectItem value="12">Últimos 12 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Incluir meta de referência?</Label>
            <RadioGroup
              value={formData.include_goal_reference ? 'yes' : 'no'}
              onValueChange={(value) => updateFormData({ include_goal_reference: value === 'yes' })}
              className="flex space-x-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="goal_ref_yes" />
                <Label htmlFor="goal_ref_yes">Sim</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="goal_ref_no" />
                <Label htmlFor="goal_ref_no">Não</Label>
              </div>
            </RadioGroup>

            {formData.include_goal_reference && (
              <div>
                <Label>Meta</Label>
                <Input
                  type="text"
                  value={formData.monthly_goal || ''}
                  onChange={(e) => handleGoalChange(e.target.value)}
                  placeholder="R$ 800,00"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          {getChartIcon()}
          <h2 className="text-lg font-bold">Você escolheu: {getChartTitle()}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure os dados que serão exibidos no seu gráfico
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          {chartType === 'evolution' && renderEvolutionConfig()}
          {chartType === 'distribution' && renderDistributionConfig()}
          {chartType === 'comparison' && renderComparisonConfig()}
        </CardContent>
      </Card>
    </div>
  );
}
