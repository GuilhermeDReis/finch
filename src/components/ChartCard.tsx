import React, { useState } from 'react';
import { MoreHorizontal, TrendingUp, TrendingDown, AlertTriangle, BarChart3 } from 'lucide-react';
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

  return (
    <>
      <Card className="h-full flex flex-col">
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
        </CardHeader>

        <CardContent className="flex-1 flex flex-col">
          <div className="flex-1 mb-4">
            <LineChart data={chartData} height={200} />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Categoria:</span>
              <Badge variant="outline" style={{ borderColor: category?.color }}>
                {categoryName}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Este mês:</span>
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className={`text-sm font-medium ${getStatusColor()}`}>
                  {formatCurrency(chartData.currentMonthSpent)} / {formatCurrency(chartData.currentMonthGoal)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {config.transaction_type === 'income' ? 'Progresso:' : 'Controle:'}
              </span>
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {config.transaction_type === 'income' 
                  ? `${Math.round(chartData.percentageOfGoal)}% da meta`
                  : `${Math.round(chartData.percentageOfGoal)}% do teto`
                }
              </span>
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