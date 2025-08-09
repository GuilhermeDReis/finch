import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { CHART_COLORS } from '@/utils/chartUtils';
import { useCharts } from '@/contexts/ChartContext';
import type { WizardStep3Data, ChartType, WizardStep2Data } from '@/types/chart';

interface Step3VisualCustomizationProps {
  chartType: ChartType;
  data: WizardStep3Data;
  step2Data?: WizardStep2Data;
  onUpdate: (data: WizardStep3Data) => void;
}

const COLOR_STYLES = [
  { id: '#3B82F6', name: '🔵 Azul Profissional' },
  { id: '#10B981', name: '🟢 Verde Crescimento' },
  { id: '#EF4444', name: '🔴 Vermelho Alerta' },
  { id: '#F59E0B', name: '🟡 Amarelo Energia' },
  { id: '#8B5CF6', name: '🟣 Roxo Criativo' },
  { id: 'rainbow', name: '🌈 Paleta Colorida (só Pizza/Barras)' }
];

export default function Step3VisualCustomization({ chartType, data, step2Data, onUpdate }: Step3VisualCustomizationProps) {
  const [formData, setFormData] = useState<WizardStep3Data>(data);
  const { allCategories, allSubcategories } = useCharts();

  const updateFormData = (updates: Partial<WizardStep3Data>) => {
    const newData = { ...formData, ...updates };
    setFormData(newData);
    onUpdate(newData);
  };

  const getDefaultChartName = () => {
    switch (chartType) {
      case 'evolution':
        if (step2Data?.evolution_scope === 'all_categories') {
          return 'Evolução dos Gastos Totais';
        } else if (step2Data?.evolution_scope === 'specific_category' && step2Data?.category_id) {
          const category = allCategories.find(cat => cat.id === step2Data.category_id);
          return `Evolução dos Gastos com ${category?.name || 'Categoria'}`;
        } else if (step2Data?.evolution_scope === 'specific_subcategory' && step2Data?.subcategory_id) {
          const subcategory = allSubcategories.find(sub => sub.id === step2Data.subcategory_id);
          return `Evolução dos Gastos com ${subcategory?.name || 'Subcategoria'}`;
        }
        return 'Evolução dos Gastos';
      case 'distribution':
        if (step2Data?.distribution_scope === 'all_categories') {
          return 'Distribuição dos Gastos por Categoria';
        } else if (step2Data?.distribution_scope === 'within_category' && step2Data?.category_id) {
          const category = allCategories.find(cat => cat.id === step2Data.category_id);
          return `Distribuição em ${category?.name || 'Categoria'}`;
        }
        return 'Distribuição dos Gastos';
      case 'comparison':
        if (step2Data?.comparison_type === 'categories_same_period') {
          return 'Comparação entre Categorias';
        } else if (step2Data?.comparison_type === 'category_different_periods' && step2Data?.category_id) {
          const category = allCategories.find(cat => cat.id === step2Data.category_id);
          return `Comparação de ${category?.name || 'Categoria'} por Período`;
        } else if (step2Data?.comparison_type === 'subcategories' && step2Data?.category_id) {
          const category = allCategories.find(cat => cat.id === step2Data.category_id);
          return `Comparação de Subcategorias em ${category?.name || 'Categoria'}`;
        }
        return 'Comparação de Gastos';
      default:
        return 'Meu Gráfico';
    }
  };

  const renderPreview = () => {
    const chartName = formData.name || getDefaultChartName();
    
    switch (chartType) {
      case 'evolution':
        return (
          <div className="border rounded-lg p-4 bg-white">
            <div className="text-center mb-4">
              <h3 className="font-medium text-sm">📈 {chartName}</h3>
            </div>
            <div className="relative">
              <div className="text-xs text-muted-foreground mb-2">R$</div>
              <div className="h-24 relative">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 text-xs text-muted-foreground">1000</div>
                <div className="absolute left-0 top-6 text-xs text-muted-foreground">800</div>
                <div className="absolute left-0 top-12 text-xs text-muted-foreground">600</div>
                <div className="absolute left-0 top-18 text-xs text-muted-foreground">400</div>
                <div className="absolute left-0 bottom-0 text-xs text-muted-foreground">200</div>
                
                {/* Chart area */}
                <div className="ml-8 h-full border-l border-b border-gray-300 relative">
                  {/* Goal line */}
                  <div className="absolute top-6 left-0 right-0 border-t border-dashed border-gray-400"></div>
                  
                  {/* Data line */}
                  <svg className="absolute inset-0 w-full h-full">
                    <polyline
                      fill="none"
                      stroke={formData.color}
                      strokeWidth="2"
                      points="10,20 30,16 50,12 70,8 90,14 110,10"
                    />
                    {formData.show_values_on_points && (
                      <>
                        <circle cx="10" cy="20" r="3" fill={formData.color} />
                        <circle cx="30" cy="16" r="3" fill={formData.color} />
                        <circle cx="50" cy="12" r="3" fill={formData.color} />
                        <circle cx="70" cy="8" r="3" fill={formData.color} />
                        <circle cx="90" cy="14" r="3" fill={formData.color} />
                        <circle cx="110" cy="10" r="3" fill={formData.color} />
                      </>
                    )}
                  </svg>
                </div>
                
                {/* X-axis labels */}
                <div className="flex justify-between mt-2 ml-8 text-xs text-muted-foreground">
                  <span>Jan</span>
                  <span>Fev</span>
                  <span>Mar</span>
                  <span>Abr</span>
                  <span>Mai</span>
                  <span>Jun</span>
                </div>
              </div>
              
              {/* Legend */}
              <div className="flex justify-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5" style={{ backgroundColor: formData.color }}></div>
                  <span>Gastos Reais</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 border-t border-dashed border-gray-400"></div>
                  <span>Meta (R$ 800)</span>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'distribution':
        return (
          <div className="border rounded-lg p-4 bg-white">
            <div className="text-center mb-4">
              <h3 className="font-medium text-sm">🥧 {chartName}</h3>
            </div>
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full relative" style={{
                background: `conic-gradient(${formData.color} 0deg 120deg, #10B981 120deg 200deg, #F59E0B 200deg 280deg, #EF4444 280deg 360deg)`
              }}>
                <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                  {formData.show_percentages && (
                    <div className="text-xs text-center">
                      <div>45%</div>
                      <div className="text-muted-foreground">Maior</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: formData.color }}></div>
                <span>Categoria A (45%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Categoria B (25%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Categoria C (20%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Outros (10%)</span>
              </div>
            </div>
          </div>
        );
        
      case 'comparison':
        return (
          <div className="border rounded-lg p-4 bg-white">
            <div className="text-center mb-4">
              <h3 className="font-medium text-sm">📊 {chartName}</h3>
            </div>
            <div className="relative h-24">
              <div className="text-xs text-muted-foreground mb-2">R$</div>
              <div className="ml-8 h-full border-l border-b border-gray-300 relative">
                {/* Bars */}
                <div className="absolute bottom-0 left-2 w-4 bg-blue-500" style={{ height: '60%' }}></div>
                <div className="absolute bottom-0 left-8 w-4 bg-green-500" style={{ height: '40%' }}></div>
                <div className="absolute bottom-0 left-14 w-4 bg-yellow-500" style={{ height: '80%' }}></div>
                <div className="absolute bottom-0 left-20 w-4 bg-red-500" style={{ height: '30%' }}></div>
                
                {formData.show_values_on_points && (
                  <>
                    <div className="absolute bottom-14 left-2 text-xs">600</div>
                    <div className="absolute bottom-10 left-8 text-xs">400</div>
                    <div className="absolute bottom-20 left-14 text-xs">800</div>
                    <div className="absolute bottom-8 left-20 text-xs">300</div>
                  </>
                )}
              </div>
              
              <div className="flex gap-2 mt-2 ml-8 text-xs text-muted-foreground">
                <span>Jan</span>
                <span>Fev</span>
                <span>Mar</span>
                <span>Abr</span>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold mb-2">🎨 Vamos deixar seu gráfico com a sua cara!</h2>
        <p className="text-sm text-muted-foreground">
          Personalize a aparência e configure as opções visuais do seu gráfico
        </p>
      </div>

      <div className="space-y-4">
        {/* Chart Name */}
        <div>
          <Label htmlFor="chart-name" className="text-base font-medium mb-3 block">Nome do Gráfico</Label>
          <Input
            id="chart-name"
            type="text"
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
            placeholder={getDefaultChartName()}
            className="h-12 text-base"
          />
        </div>

        {/* Colors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cores</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Label className="text-base font-medium">Escolha um estilo:</Label>
              <div className="space-y-4">
                {COLOR_STYLES.map((style) => (
                  <div key={style.id} className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id={style.id}
                      name="color-style"
                      checked={formData.color === style.id}
                      onChange={() => updateFormData({ color: style.id })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor={style.id} className="text-base cursor-pointer">
                      {style.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Options */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Opções Avançadas</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="show-values"
                  checked={formData.show_values_on_points}
                  onCheckedChange={(checked) => updateFormData({ show_values_on_points: !!checked })}
                />
                <Label htmlFor="show-values" className="text-base">
                  Mostrar valores nos pontos
                </Label>
              </div>

              {chartType === 'distribution' && (
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="show-percentages"
                    checked={formData.show_percentages}
                    onCheckedChange={(checked) => updateFormData({ show_percentages: !!checked })}
                  />
                  <Label htmlFor="show-percentages" className="text-base">
                    Exibir percentuais (Pizza)
                  </Label>
                </div>
              )}

              {chartType === 'evolution' && (
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="show-trend"
                    checked={formData.show_trend_line}
                    onCheckedChange={(checked) => updateFormData({ show_trend_line: !!checked })}
                  />
                  <Label htmlFor="show-trend" className="text-base">
                    Incluir linha de tendência
                  </Label>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="highlight-minmax"
                  checked={formData.highlight_min_max}
                  onCheckedChange={(checked) => updateFormData({ highlight_min_max: !!checked })}
                />
                <Label htmlFor="highlight-minmax" className="text-base">
                  Destacar valor máximo/mínimo
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {renderPreview()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
