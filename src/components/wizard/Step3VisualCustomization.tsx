import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { WizardStep2Data, WizardStep3Data, ChartType } from '@/types/chart';

interface Step3VisualCustomizationProps {
  chartType: ChartType;
  data: WizardStep3Data;
  step2Data: WizardStep2Data;
  onUpdate: (data: WizardStep3Data) => void;
}

const COLOR_STYLES = [
  { name: 'Azul Profissional', primary: '#2563eb', secondary: '#3b82f6', accent: '#60a5fa' },
  { name: 'Verde Crescimento', primary: '#059669', secondary: '#10b981', accent: '#34d399' },
  { name: 'Roxo Moderno', primary: '#7c3aed', secondary: '#8b5cf6', accent: '#a78bfa' },
  { name: 'Laranja Energia', primary: '#ea580c', secondary: '#f97316', accent: '#fb923c' },
  { name: 'Rosa Criativo', primary: '#db2777', secondary: '#ec4899', accent: '#f472b6' },
  { name: 'Cinza Elegante', primary: '#374151', secondary: '#6b7280', accent: '#9ca3af' },
];

export default function Step3VisualCustomization({ chartType, data, step2Data, onUpdate }: Step3VisualCustomizationProps) {
  const [formData, setFormData] = useState<WizardStep3Data>(data);

  const updateFormData = (updates: Partial<WizardStep3Data>) => {
    const newData = { ...formData, ...updates };
    setFormData(newData);
    onUpdate(newData);
  };

  const getDefaultChartName = () => {
    if (!step2Data) {
      return 'Meu Gráfico';
    }

    switch (chartType) {
      case 'evolution':
        if (step2Data.evolution_scope === 'all_categories') {
          return 'Evolução dos Gastos Totais';
        } else if (step2Data.evolution_scope === 'specific_category') {
          return `Evolução da Categoria`;
        } else {
          return `Evolução da Subcategoria`;
        }
      case 'distribution':
        if (step2Data.distribution_scope === 'all_categories') {
          return 'Distribuição por Categorias';
        } else {
          return 'Distribuição por Subcategorias';
        }
      case 'comparison':
        if (step2Data.comparison_type === 'categories_same_period') {
          return 'Comparação entre Categorias';
        } else if (step2Data.comparison_type === 'category_different_periods') {
          return 'Comparação de Períodos';
        } else {
          return 'Comparação de Subcategorias';
        }
      default:
        return 'Meu Gráfico';
    }
  };

  const renderEvolutionPreview = () => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h4 className="font-medium mb-3">📈 Preview: Gráfico de Evolução</h4>
      <div className="space-y-2 text-sm text-gray-600">
        <p>• Linha temporal mostrando a evolução dos gastos</p>
        <p>• Eixo X: Meses do período selecionado</p>
        <p>• Eixo Y: Valores em reais (R$)</p>
        {step2Data?.has_monthly_goal && (
          <p>• Linha de meta mensal para referência</p>
        )}
        <p>• Pontos interativos com valores detalhados</p>
      </div>
    </div>
  );

  const renderDistributionPreview = () => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h4 className="font-medium mb-3">🥧 Preview: Gráfico de Pizza</h4>
      <div className="space-y-2 text-sm text-gray-600">
        <p>• Fatias proporcionais aos valores gastos</p>
        <p>• Percentuais e valores em cada fatia</p>
        <p>• Legenda com cores identificadoras</p>
        <p>• Hover para detalhes adicionais</p>
        {formData.show_percentages && (
           <p>• Percentuais visíveis nas fatias</p>
         )}
      </div>
    </div>
  );

  const renderComparisonPreview = () => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h4 className="font-medium mb-3">📊 Preview: Gráfico de Barras</h4>
      <div className="space-y-2 text-sm text-gray-600">
        <p>• Barras verticais para comparação visual</p>
        <p>• Eixo X: Categorias/Períodos/Subcategorias</p>
        <p>• Eixo Y: Valores em reais (R$)</p>
        {step2Data?.include_goal_reference && (
           <p>• Linha de referência de meta</p>
         )}
        <p>• Cores diferenciadas para cada barra</p>
      </div>
    </div>
  );

  const renderPreview = () => {
    switch (chartType) {
      case 'evolution':
        return renderEvolutionPreview();
      case 'distribution':
        return renderDistributionPreview();
      case 'comparison':
        return renderComparisonPreview();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-bold mb-2">🎨 Personalização Visual</h2>
        <p className="text-sm text-muted-foreground">
          Customize a aparência do seu gráfico
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nome do Gráfico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
             <Label className="text-sm font-medium mb-2 block">Título</Label>
             <Input
               placeholder={getDefaultChartName()}
               value={formData.name || ''}
               onChange={(e) => updateFormData({ name: e.target.value })}
               className="h-10"
             />
           </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Esquema de Cores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
             {COLOR_STYLES.map((style, index) => (
               <div
                 key={index}
                 className={`p-3 border rounded-lg cursor-pointer transition-all ${
                   formData.color === style.primary
                     ? 'border-blue-500 bg-blue-50'
                     : 'border-gray-200 hover:border-gray-300'
                 }`}
                 onClick={() => updateFormData({ color: style.primary })}
               >
                 <div className="flex items-center space-x-2 mb-2">
                   <div
                     className="w-4 h-4 rounded"
                     style={{ backgroundColor: style.primary }}
                   />
                   <div
                     className="w-4 h-4 rounded"
                     style={{ backgroundColor: style.secondary }}
                   />
                   <div
                     className="w-4 h-4 rounded"
                     style={{ backgroundColor: style.accent }}
                   />
                 </div>
                 <p className="text-sm font-medium">{style.name}</p>
               </div>
             ))}
           </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {renderPreview()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Opções de Visualização</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {chartType === 'evolution' && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show_values_on_points"
                    checked={formData.show_values_on_points || false}
                    onCheckedChange={(checked) => updateFormData({ show_values_on_points: checked as boolean })}
                  />
                  <Label htmlFor="show_values_on_points" className="text-sm">
                    Mostrar valores nos pontos do gráfico
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show_trend_line"
                    checked={formData.show_trend_line || false}
                    onCheckedChange={(checked) => updateFormData({ show_trend_line: checked as boolean })}
                  />
                  <Label htmlFor="show_trend_line" className="text-sm">
                    Mostrar linha de tendência
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="highlight_min_max"
                    checked={formData.highlight_min_max || false}
                    onCheckedChange={(checked) => updateFormData({ highlight_min_max: checked as boolean })}
                  />
                  <Label htmlFor="highlight_min_max" className="text-sm">
                    Destacar valores mínimo e máximo
                  </Label>
                </div>
              </>
            )}

            {chartType === 'distribution' && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show_percentages"
                    checked={formData.show_percentages || false}
                    onCheckedChange={(checked) => updateFormData({ show_percentages: checked as boolean })}
                  />
                  <Label htmlFor="show_percentages" className="text-sm">
                    Mostrar percentuais nas fatias
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show_values_on_points"
                    checked={formData.show_values_on_points || false}
                    onCheckedChange={(checked) => updateFormData({ show_values_on_points: checked as boolean })}
                  />
                  <Label htmlFor="show_values_on_points" className="text-sm">
                    Mostrar valores nas fatias
                  </Label>
                </div>
              </>
            )}

            {chartType === 'comparison' && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show_values_on_points"
                    checked={formData.show_values_on_points || false}
                    onCheckedChange={(checked) => updateFormData({ show_values_on_points: checked as boolean })}
                  />
                  <Label htmlFor="show_values_on_points" className="text-sm">
                    Mostrar valores nas barras
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show_percentages"
                    checked={formData.show_percentages || false}
                    onCheckedChange={(checked) => updateFormData({ show_percentages: checked as boolean })}
                  />
                  <Label htmlFor="show_percentages" className="text-sm">
                    Mostrar percentuais relativos
                  </Label>
                </div>
              </>
            )}
          </div>

          {/* Tips based on chart type */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
            <div className="flex items-start space-x-2">
              <span className="text-blue-500">💡</span>
              <div className="text-sm text-blue-700">
                {chartType === 'evolution' && (
                  <>
                    <p className="font-medium mb-1">Dicas para gráfico de evolução:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Valores nos pontos ajudam a ver números exatos</li>
                      <li>• Linha de tendência mostra direção geral dos gastos</li>
                      <li>• Destaque de min/max identifica períodos extremos</li>
                    </ul>
                  </>
                )}
                {chartType === 'distribution' && (
                  <>
                    <p className="font-medium mb-1">Dicas para gráfico de pizza:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Percentuais mostram proporção de cada categoria</li>
                      <li>• Valores nas fatias exibem montantes reais</li>
                      <li>• Ideal para ver onde você gasta mais</li>
                    </ul>
                  </>
                )}
                {chartType === 'comparison' && (
                  <>
                    <p className="font-medium mb-1">Dicas para gráfico de barras:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Valores nas barras mostram montantes exatos</li>
                      <li>• Percentuais ajudam a comparar proporções</li>
                      <li>• Perfeito para comparações visuais rápidas</li>
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
