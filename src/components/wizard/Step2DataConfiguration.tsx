import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useCharts } from '@/contexts/ChartContext';
import type { WizardStep2Data, ChartType, ChartPeriod } from '@/types/chart';

interface Step2DataConfigurationProps {
  chartType: ChartType;
  data: WizardStep2Data;
  onUpdate: (data: WizardStep2Data) => void;
}

export default function Step2DataConfiguration({ chartType, data, onUpdate }: Step2DataConfigurationProps) {
  const [formData, setFormData] = useState<WizardStep2Data>(data);
  const { allCategories, allSubcategories } = useCharts();

  const updateFormData = (updates: Partial<WizardStep2Data>) => {
    const newData = { ...formData, ...updates };
    setFormData(newData);
    onUpdate(newData);
  };

  const getSubcategoriesForCategory = (categoryId: string) => {
    return allSubcategories.filter(sub => sub.category_id === categoryId);
  };

  const renderEvolutionConfig = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium mb-3 block">O que você quer acompanhar?</Label>
        <Select
          value={formData.evolution_scope || ''}
          onValueChange={(value) => updateFormData({ 
            evolution_scope: value as WizardStep2Data['evolution_scope'],
            category_id: undefined,
            subcategory_id: undefined
          })}
        >
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Selecione o escopo da evolução" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_categories">Evolução dos gastos totais</SelectItem>
            <SelectItem value="specific_category">Evolução de uma categoria específica</SelectItem>
            <SelectItem value="specific_subcategory">Evolução de uma subcategoria específica</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.evolution_scope === 'specific_category' && (
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
              {allCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {formData.evolution_scope === 'specific_subcategory' && (
        <>
          <div>
            <Label className="text-base font-medium mb-3 block">Categoria</Label>
            <Select
              value={formData.category_id || ''}
              onValueChange={(value) => updateFormData({ 
                category_id: value,
                subcategory_id: undefined
              })}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {allCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.category_id && (
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
                  {getSubcategoriesForCategory(formData.category_id).map((subcategory) => (
                    <SelectItem key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}

      <div className="flex items-center space-x-2">
        <Checkbox
          id="has_monthly_goal"
          checked={formData.has_monthly_goal || false}
          onCheckedChange={(checked) => updateFormData({ 
            has_monthly_goal: checked as boolean,
            monthly_goal: checked ? formData.monthly_goal : undefined
          })}
        />
        <Label htmlFor="has_monthly_goal" className="text-sm font-medium">
          Definir meta mensal
        </Label>
      </div>

      {formData.has_monthly_goal && (
        <div>
          <Label className="text-base font-medium mb-3 block">Meta Mensal (R$)</Label>
          <Input
            type="number"
            placeholder="Ex: 1500"
            value={formData.monthly_goal || ''}
            onChange={(e) => updateFormData({ monthly_goal: e.target.value })}
            className="h-12"
          />
        </div>
      )}

      <div>
        <Label className="text-base font-medium mb-3 block">Período de Análise</Label>
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
    </div>
  );

  const renderDistributionConfig = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium mb-3 block">Escopo da Distribuição</Label>
        <Select
          value={formData.distribution_scope || ''}
          onValueChange={(value) => updateFormData({ 
            distribution_scope: value as WizardStep2Data['distribution_scope'],
            category_id: undefined
          })}
        >
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Selecione o escopo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_categories">Todas as categorias</SelectItem>
            <SelectItem value="within_category">Subcategorias dentro de uma categoria</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.distribution_scope === 'within_category' && (
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
              {allCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {formData.category_id && formData.distribution_scope === 'within_category' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium mb-2">Subcategorias encontradas:</h4>
          <div className="flex flex-wrap gap-2">
            {getSubcategoriesForCategory(formData.category_id).map((subcategory) => (
              <span
                key={subcategory.id}
                className="px-2 py-1 bg-white border border-gray-300 rounded text-sm"
              >
                {subcategory.name}
              </span>
            ))}
          </div>
          {getSubcategoriesForCategory(formData.category_id).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma subcategoria encontrada para esta categoria.
            </p>
          )}
        </div>
      )}
    </div>
  );

  const renderComparisonConfig = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium mb-3 block">Tipo de Comparação</Label>
        <Select
          value={formData.comparison_type || ''}
          onValueChange={(value) => updateFormData({ 
            comparison_type: value as WizardStep2Data['comparison_type'],
            category_id: undefined,
            subcategory_id: undefined
          })}
        >
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Selecione o tipo de comparação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="categories_same_period">Categorias no mesmo período</SelectItem>
            <SelectItem value="category_different_periods">Mesma categoria em períodos diferentes</SelectItem>
            <SelectItem value="subcategories">Subcategorias de uma categoria</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(formData.comparison_type === 'category_different_periods' || 
        formData.comparison_type === 'subcategories') && (
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
              {allCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label className="text-base font-medium mb-3 block">Período de Análise</Label>
        <Select
          value={formData.period_months?.toString() || '3'}
          onValueChange={(value) => updateFormData({ period_months: parseInt(value) as ChartPeriod })}
        >
          <SelectTrigger className="h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Últimos 3 meses</SelectItem>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
            <SelectItem value="12">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="include_goal_reference"
          checked={formData.include_goal_reference || false}
          onCheckedChange={(checked) => updateFormData({ include_goal_reference: checked as boolean })}
        />
        <Label htmlFor="include_goal_reference" className="text-sm font-medium">
          Incluir linha de referência de meta
        </Label>
      </div>
    </div>
  );

  const getTitle = () => {
    switch (chartType) {
      case 'evolution':
        return '📈 Configure a Evolução';
      case 'distribution':
        return '🥧 Configure a Distribuição';
      case 'comparison':
        return '📊 Configure a Comparação';
      default:
        return 'Configure os Dados';
    }
  };

  const getDescription = () => {
    switch (chartType) {
      case 'evolution':
        return 'Defina o que você quer acompanhar ao longo do tempo';
      case 'distribution':
        return 'Escolha como você quer visualizar a distribuição dos seus gastos';
      case 'comparison':
        return 'Selecione o que você quer comparar';
      default:
        return 'Configure os dados do seu gráfico';
    }
  };

  const renderConfig = () => {
    switch (chartType) {
      case 'evolution':
        return renderEvolutionConfig();
      case 'distribution':
        return renderDistributionConfig();
      case 'comparison':
        return renderComparisonConfig();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-bold mb-2">{getTitle()}</h2>
        <p className="text-sm text-muted-foreground">
          {getDescription()}
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          {renderConfig()}
        </CardContent>
      </Card>
    </div>
  );
}
