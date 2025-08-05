import React, { useState } from 'react';
import { Plus, BarChart3, TrendingUp, GripVertical } from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ChartCard from '@/components/ChartCard';
import AddChartModal from '@/components/AddChartModal';
import DashboardTotalCard from '@/components/DashboardTotalCard';
import { useCharts } from '@/contexts/ChartContext';
import { useDashboardTotals } from '@/hooks/useDashboardTotals';

export default function DashboardPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  
  const { chartConfigs, loading, reorderCharts } = useCharts();
  const { totals, loading: totalsLoading } = useDashboardTotals(selectedYear, selectedMonth);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = chartConfigs.findIndex(chart => chart.id === active.id);
      const newIndex = chartConfigs.findIndex(chart => chart.id === over.id);
      
      const newOrder = arrayMove(chartConfigs, oldIndex, newIndex);
      const chartIds = newOrder.map(chart => chart.id);
      
      reorderCharts(chartIds);
    }
  };

  const years = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - i);
  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

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

        {/* Total Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
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
        
        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {chartConfigs.length > 0 && (
            <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Gráfico
            </Button>
          )}
        </div>
      </div>

      {/* Total Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardTotalCard
          title="Saldo"
          value={totals.balance}
          type="balance"
          loading={totalsLoading}
        />
        <DashboardTotalCard
          title="Total de Receitas"
          value={totals.totalIncome}
          type="income"
          loading={totalsLoading}
        />
        <DashboardTotalCard
          title="Total de Gastos"
          value={totals.totalExpenses}
          type="expense"
          loading={totalsLoading}
        />
        <DashboardTotalCard
          title="Crédito"
          value={totals.totalCredit}
          type="credit"
          loading={totalsLoading}
        />
      </div>

      {/* Charts Grid or Empty State */}
      {chartConfigs.length === 0 ? (
        <EmptyState />
      ) : (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={chartConfigs.map(chart => chart.id)}
            strategy={rectSortingStrategy}
          >
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
          </SortableContext>
        </DndContext>
      )}

      <AddChartModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
}