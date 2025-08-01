import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Edit2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useCharts } from '@/contexts/ChartContext';
import { CHART_COLORS, formatCurrency } from '@/utils/chartUtils';
import type { ChartFormData, ChartPeriod, ChartConfig } from '@/types/chart';
import { cn } from '@/lib/utils';

interface EditChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  chartConfig: ChartConfig;
}

export default function EditChartModal({ isOpen, onClose, chartConfig }: EditChartModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<any[]>([]);
  const { allCategories, allSubcategories, chartConfigs, updateChart, removeChart } = useCharts();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ChartFormData>();

  const selectedColor = watch('color');
  const monthlyGoalValue = watch('monthly_goal');
  const selectedCategoryId = watch('category_id');

  const filteredCategories = allCategories.filter(cat => cat.type === chartConfig.transaction_type);

  // Load subcategories
  useEffect(() => {
    setSubcategories(allSubcategories || []);
  }, [allSubcategories]);

  // Filter subcategories based on selected category
  useEffect(() => {
    if (chartConfig.grouping_type === 'subcategory' && selectedCategoryId) {
      const filtered = subcategories.filter(sub => sub.category_id === selectedCategoryId);
      setFilteredSubcategories(filtered);
    } else {
      setFilteredSubcategories([]);
    }
  }, [selectedCategoryId, chartConfig.grouping_type, subcategories]);

  // Initialize form with chart config data
  useEffect(() => {
    if (isOpen && chartConfig) {
      reset({
        name: chartConfig.name,
        category_id: chartConfig.category_id,
        monthly_goal: formatCurrency(chartConfig.monthly_goal),
        color: chartConfig.color,
        period_months: chartConfig.period_months,
      });
    }
  }, [isOpen, chartConfig, reset]);

  const formatCurrencyInput = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    const formattedValue = (Number(numericValue) / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    return formattedValue;
  };

  const handleMonthlyGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value);
    setValue('monthly_goal', formatted);
  };

  const validateUniqueName = (name: string) => {
    const existingNames = chartConfigs
      .filter(chart => chart.id !== chartConfig.id)
      .map(chart => chart.name.toLowerCase());
    return !existingNames.includes(name.toLowerCase()) || 'Já existe um gráfico com este nome';
  };

  const onSubmit = async (data: ChartFormData) => {
    setIsSubmitting(true);
    try {
      await updateChart(chartConfig.id, data);
      onClose();
    } catch (error) {
      // console.error('Error updating chart:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    await removeChart(chartConfig.id);
    setShowDeleteDialog(false);
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              Editar Gráfico
            </DialogTitle>
            <DialogDescription>
              Modifique as configurações do gráfico "{chartConfig.name}".
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Nome do Gráfico */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Gráfico *</Label>
              <Input
                id="name"
                {...register('name', {
                  required: 'Nome é obrigatório',
                  validate: validateUniqueName,
                })}
                placeholder="Ex: Controle de Alimentação"
                className={cn(errors.name && 'border-destructive')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <Label htmlFor="category_id">Categoria *</Label>
              <Select 
                value={watch('category_id')} 
                onValueChange={(value) => setValue('category_id', value)}
              >
                <SelectTrigger className={cn(errors.category_id && 'border-destructive')}>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((category) => (
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
              {errors.category_id && (
                <p className="text-sm text-destructive">Categoria é obrigatória</p>
              )}
            </div>

            {/* Subcategory Selection - Only show if grouping by subcategory */}
            {chartConfig.grouping_type === 'subcategory' && (
              <div className="space-y-2">
                <Label>Subcategoria</Label>
                <Select 
                  value={chartConfig.grouping_type === 'subcategory' ? watch('category_id') : ''} 
                  onValueChange={(value) => setValue('category_id', value)}
                  disabled={!selectedCategoryId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedCategoryId ? "Selecione uma subcategoria" : "Primeiro selecione uma categoria"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubcategories.map((subcategory) => (
                      <SelectItem key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCategoryId && filteredSubcategories.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma subcategoria encontrada para esta categoria.
                  </p>
                )}
              </div>
            )}

            {/* Meta Mensal */}
            <div className="space-y-2">
              <Label htmlFor="monthly_goal">Meta Mensal *</Label>
              <Input
                id="monthly_goal"
                {...register('monthly_goal', {
                  required: 'Meta mensal é obrigatória',
                  validate: (value) => {
                    const numericValue = Number(value.replace(/[^\d,]/g, '').replace(',', '.'));
                    return numericValue > 0 || 'Meta deve ser maior que zero';
                  },
                })}
                placeholder="R$ 0,00"
                onChange={handleMonthlyGoalChange}
                className={cn(errors.monthly_goal && 'border-destructive')}
              />
              {errors.monthly_goal && (
                <p className="text-sm text-destructive">{errors.monthly_goal.message}</p>
              )}
            </div>

            {/* Período de Análise */}
            <div className="space-y-2">
              <Label htmlFor="period_months">Período de Análise</Label>
              <Select 
                value={watch('period_months')?.toString()} 
                onValueChange={(value) => setValue('period_months', Number(value) as ChartPeriod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                  <SelectItem value="24">24 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Seletor de Cor */}
            <div className="space-y-2">
              <Label>Cor do Gráfico</Label>
              <div className="grid grid-cols-6 gap-2">
                {CHART_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all',
                      selectedColor === color
                        ? 'border-foreground scale-110'
                        : 'border-border hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setValue('color', color)}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            {monthlyGoalValue && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Preview da meta:</p>
                <p className="font-medium">{monthlyGoalValue} por mês</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-between pt-4">
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDelete}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Deletar
              </Button>
              
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Gráfico</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o gráfico "{chartConfig.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}