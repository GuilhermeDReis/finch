import React, { useState } from 'react';
import { MoreHorizontal, TrendingUp, TrendingDown, AlertTriangle, BarChart3, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import LineChart from './LineChart';
import PieChart from './PieChart';
import BarChart from './BarChart';
import EditChartModal from './EditChartModal';
import { useCharts } from '@/contexts/ChartContext';
import { processChartData, formatCurrency } from '@/utils/chartUtils';
import type { ChartConfig } from '@/types/chart';

interface ChartCardProps {
  config: ChartConfig;
}

export default function ChartCard({ config }: ChartCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { allTransactions, allCategories, removeChart, duplicateChart } = useCharts();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: config.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Find category name
  const category = allCategories.find(cat => cat.id === config.category_id);
  const categoryName = category?.name || 'Categoria não encontrada';

  // Process chart data
  const chartData = processChartData(config, allTransactions, categoryName);

  const getStatusIcon = () => {
    switch (chartData.status) {
      case 'success':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'danger':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <BarChart3 className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (chartData.status) {
      case 'success':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'danger':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleDuplicate = async () => {
    await duplicateChart(config.id);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    await removeChart(config.id);
    setShowDeleteDialog(false);
  };

  const renderChart = () => {
    const chartType = config.chart_type || 'line';
    
    switch (chartType) {
      case 'distribution':
        return <PieChart data={chartData} height={200} />;
      case 'comparison':
        return <BarChart data={chartData} height={200} />;
      case 'evolution':
      default:
        return <LineChart data={chartData} height={200} />;
    }
  };

  return (
    <>
      <Card 
        ref={setNodeRef}
        style={style}
        className={`h-full flex flex-col ${isDragging ? 'shadow-xl ring-2 ring-primary/20 z-50' : 'hover:shadow-lg'} transition-shadow`}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: config.color }}
            />
            <CardTitle className="text-base font-medium truncate">
              {config.name}
            </CardTitle>
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 cursor-grab active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate}>
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col">
          <div className="flex-1 mb-4">
            {renderChart()}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Categoria:</span>
              <Badge variant="outline" style={{ borderColor: category?.color }}>
                {categoryName}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <EditChartModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        chartConfig={config}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Gráfico</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o gráfico "{config.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}