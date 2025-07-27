import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    title: 'EVOLUÇÃO',
    subtitle: 'Gráfico de linha',
    icon: TrendingUp,
    benefits: [
      'Acompanhar evolução',
      'Identificar tendências',
      'Comparar com metas'
    ]
  },
  {
    id: 'distribution' as ChartType,
    title: 'DISTRIBUIÇÃO',
    subtitle: 'Gráfico de pizza',
    icon: PieChart,
    benefits: [
      'Ver proporção entre partes',
      'Encontrar maiores gastos',
      'Análise de categorias'
    ]
  },
  {
    id: 'comparison' as ChartType,
    title: 'COMPARAÇÃO',
    subtitle: 'Gráfico de barras',
    icon: BarChart3,
    benefits: [
      'Ver diferenças entre meses',
      'Identificar picos e quedas',
      'Análise de múltiplas variáveis'
    ]
  }
];

export default function Step1ChartTypeSelection({ data, onUpdate, onNext }: Step1ChartTypeSelectionProps) {
  const [selectedType, setSelectedType] = React.useState<ChartType>(data.chart_type);

  const handleSelect = (chartType: ChartType) => {
    setSelectedType(chartType);
    onUpdate({ chart_type: chartType });
    // Auto-advance after selection
    setTimeout(() => {
      onNext();
    }, 300);
  };

  const renderChartPreview = (type: ChartType) => {
    switch (type) {
      case 'evolution':
        return (
          <div className="w-full h-16 flex items-end justify-center space-x-1 mb-4">
            <div className="w-1 bg-blue-500 h-8"></div>
            <div className="w-1 bg-blue-500 h-12"></div>
            <div className="w-1 bg-blue-500 h-6"></div>
            <div className="w-1 bg-blue-500 h-14"></div>
            <div className="w-1 bg-blue-500 h-10"></div>
            <div className="w-1 bg-blue-500 h-16"></div>
          </div>
        );
      case 'distribution':
        return (
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="w-16 h-16 rounded-full border-8 border-blue-500 border-r-green-500 border-b-yellow-500 border-l-red-500"></div>
          </div>
        );
      case 'comparison':
        return (
          <div className="w-full h-16 flex items-end justify-center space-x-2 mb-4">
            <div className="w-4 bg-blue-500 h-12"></div>
            <div className="w-4 bg-green-500 h-8"></div>
            <div className="w-4 bg-yellow-500 h-16"></div>
            <div className="w-4 bg-red-500 h-6"></div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Escolha o Tipo de Gráfico</h2>
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
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/50 ${
                isSelected ? 'ring-2 ring-primary border-primary' : ''
              }`}
              onClick={() => handleSelect(chartType.id)}
            >
              <CardContent className="p-4 text-center h-full flex flex-col">
                <div className="mb-3">
                  <Icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <h3 className="text-lg font-bold mb-1">{chartType.title}</h3>
                  <p className="text-xs text-muted-foreground">{chartType.subtitle}</p>
                </div>

                <div className="mb-3">
                  {renderChartPreview(chartType.id)}
                </div>

                <div className="space-y-2 flex-grow">
                  {chartType.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center justify-start text-xs">
                      <span className="text-green-500 mr-2 text-sm">✅</span>
                      <span className="text-left">{benefit}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t">
                  <Button 
                    variant={isSelected ? "default" : "outline"} 
                    size="sm" 
                    className="w-full text-xs"
                  >
                    {isSelected ? 'SELECIONADO' : 'ESCOLHER'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
