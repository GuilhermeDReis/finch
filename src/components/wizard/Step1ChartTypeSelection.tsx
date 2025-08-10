import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, PieChart, BarChart3 } from 'lucide-react';
import type { WizardStep1Data, ChartType } from '@/types/chart';

interface Step1ChartTypeSelectionProps {
  data: WizardStep1Data;
  onUpdate: (data: WizardStep1Data) => void;
  onNext: () => void;
}

const CHART_TYPES = [
  {
    id: 'evolution' as ChartType,
    title: 'Evolução',
    subtitle: 'Acompanhe tendências ao longo do tempo',
    benefits: ['📈 Visualize tendências', '🎯 Acompanhe metas', '📊 Compare períodos'],
    icon: TrendingUp,
    color: 'text-blue-500'
  },
  {
    id: 'distribution' as ChartType,
    title: 'Distribuição',
    subtitle: 'Veja como seus gastos se distribuem',
    benefits: ['🥧 Proporções claras', '💡 Identifique padrões', '🔍 Análise detalhada'],
    icon: PieChart,
    color: 'text-green-500'
  },
  {
    id: 'comparison' as ChartType,
    title: 'Comparação',
    subtitle: 'Compare categorias ou períodos',
    benefits: ['📊 Compare valores', '⚖️ Analise diferenças', '🎯 Tome decisões'],
    icon: BarChart3,
    color: 'text-purple-500'
  }
];

export default function Step1ChartTypeSelection({ data, onUpdate, onNext }: Step1ChartTypeSelectionProps) {
  const selectedType = data.chart_type;

  const handleTypeSelect = (type: ChartType) => {
    onUpdate({ chart_type: type });
    // Auto-advance to next step after selection
    setTimeout(() => {
      onNext();
    }, 300);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-bold mb-2">Escolha o Tipo de Gráfico</h2>
        <p className="text-sm text-muted-foreground">
          Selecione o tipo de análise que melhor atende às suas necessidades
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CHART_TYPES.map((chartType) => {
          const Icon = chartType.icon;
          const isSelected = selectedType === chartType.id;
          
          return (
            <Card
              key={chartType.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected 
                  ? 'ring-2 ring-primary bg-primary/5' 
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => handleTypeSelect(chartType.id)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className={`p-3 rounded-full bg-muted ${chartType.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg">{chartType.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {chartType.subtitle}
                    </p>
                  </div>

                  <div className="space-y-1">
                    {chartType.benefits.map((benefit, index) => (
                      <p key={index} className="text-xs text-muted-foreground">
                        {benefit}
                      </p>
                    ))}
                  </div>

                  {isSelected && (
                    <div className="w-full pt-2">
                      <div className="w-full h-1 bg-primary rounded-full" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
