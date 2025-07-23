import React, { useState } from 'react';
import { Plus, BarChart3, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ChartCard from '@/components/ChartCard';
import AddChartModal from '@/components/AddChartModal';
import { useCharts } from '@/contexts/ChartContext';

export default function DashboardPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const { chartConfigs, loading } = useCharts();

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Financeiro</h1>
            <p className="text-muted-foreground">Monitore seus gastos por categoria com metas personalizadas</p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="h-80">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                  <Skeleton className="h-40 w-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
        <BarChart3 className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Nenhum gráfico criado ainda</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Crie seu primeiro gráfico para começar a monitorar seus gastos por categoria com metas personalizadas.
      </p>
      <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
        <Plus className="h-4 w-4" />
        Criar Primeiro Gráfico
      </Button>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            Dashboard Financeiro
          </h1>
          <p className="text-muted-foreground">
            Monitore seus gastos por categoria com metas personalizadas
          </p>
        </div>
        
        {chartConfigs.length > 0 && (
          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Gráfico
          </Button>
        )}
      </div>

      {/* Charts Grid or Empty State */}
      {chartConfigs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chartConfigs.map((config) => (
            <ChartCard key={config.id} config={config} />
          ))}
          
          {/* Add Chart Card */}
          <Card 
            className="h-80 border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer group"
            onClick={() => setShowAddModal(true)}
          >
            <CardContent className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                <Plus className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <h3 className="font-medium mb-2 group-hover:text-primary transition-colors">
                Adicionar Gráfico
              </h3>
              <p className="text-sm text-muted-foreground">
                Crie um novo gráfico para monitorar uma categoria específica
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <AddChartModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
}