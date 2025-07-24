import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useCharts } from '@/contexts/ChartContext';
import { CHART_COLORS } from '@/utils/chartUtils';
import type { ChartFormData, ChartPeriod, TransactionType, GroupingType } from '@/types/chart';

interface AddChartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddChartModal({ isOpen, onClose }: AddChartModalProps) {
  const { addChart, allCategories } = useCharts();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<ChartFormData>({
    name: '',
    category_id: '',
    monthly_goal: '',
    color: CHART_COLORS[0],
    period_months: 12,
    transaction_type: 'expense',
    grouping_type: 'category'
  });

  const [filteredCategories, setFilteredCategories] = useState(allCategories);

  // Filter categories based on transaction type
  useEffect(() => {
    const filtered = allCategories.filter(cat => cat.type === formData.transaction_type);
    setFilteredCategories(filtered);
    
    // Reset category selection if current category doesn't match transaction type
    if (formData.category_id) {
      const currentCategory = allCategories.find(cat => cat.id === formData.category_id);
      if (currentCategory && currentCategory.type !== formData.transaction_type) {
        setFormData(prev => ({ ...prev, category_id: '' }));
      }
    }
  }, [formData.transaction_type, allCategories]);

  const resetForm = () => {
    setFormData({
      name: '',
      category_id: '',
      monthly_goal: '',
      color: CHART_COLORS[0],
      period_months: 12,
      transaction_type: 'expense',
      grouping_type: 'category'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para o gráfico.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.category_id) {
      toast({
        title: "Categoria obrigatória",
        description: "Por favor, selecione uma categoria.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.monthly_goal || parseFloat(formData.monthly_goal.replace(/[^\d,]/g, '').replace(',', '.')) <= 0) {
      toast({
        title: "Meta inválida",
        description: "Por favor, insira uma meta mensal válida.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addChart(formData);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error in form submission:', error);
    }
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    if (!numericValue) return '';
    
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseInt(numericValue));
    
    return formatted;
  };

  const handleGoalChange = (value: string) => {
    const formatted = formatCurrency(value);
    setFormData(prev => ({ ...prev, monthly_goal: formatted }));
  };

  const getTransactionTypeLabel = (type: TransactionType) => {
    return type === 'income' ? 'Receita' : 'Despesa';
  };

  const getGoalLabel = () => {
    return formData.transaction_type === 'income' ? 'Meta Mensal' : 'Teto Mensal';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Gráfico</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transaction Type Selection */}
          <div className="space-y-3">
            <Label>Tipo de Transação</Label>
            <RadioGroup
              value={formData.transaction_type}
              onValueChange={(value: TransactionType) => 
                setFormData(prev => ({ ...prev, transaction_type: value }))
              }
              className="flex space-x-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="expense" id="expense" />
                <Label htmlFor="expense">Despesa</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="income" id="income" />
                <Label htmlFor="income">Receita</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Grouping Type Selection */}
          <div className="space-y-2">
            <Label>Agrupar por</Label>
            <Select 
              value={formData.grouping_type} 
              onValueChange={(value: GroupingType) => 
                setFormData(prev => ({ ...prev, grouping_type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="category">Categoria</SelectItem>
                <SelectItem value="subcategory">Subcategoria</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Chart Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Gráfico</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Gastos com Alimentação"
            />
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select 
              value={formData.category_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
            >
              <SelectTrigger>
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
            {filteredCategories.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma categoria de {getTransactionTypeLabel(formData.transaction_type).toLowerCase()} encontrada.
              </p>
            )}
          </div>

          {/* Monthly Goal */}
          <div className="space-y-2">
            <Label htmlFor="goal">{getGoalLabel()}</Label>
            <Input
              id="goal"
              type="text"
              value={formData.monthly_goal}
              onChange={(e) => handleGoalChange(e.target.value)}
              placeholder="R$ 0"
            />
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label>Cor do Gráfico</Label>
            <div className="flex gap-2 flex-wrap">
              {CHART_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color ? 'border-foreground' : 'border-border'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                />
              ))}
            </div>
          </div>

          {/* Period Selection */}
          <div className="space-y-2">
            <Label>Período de Análise</Label>
            <Select 
              value={formData.period_months.toString()} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, period_months: parseInt(value) as ChartPeriod }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 meses</SelectItem>
                <SelectItem value="12">12 meses</SelectItem>
                <SelectItem value="24">24 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              Criar Gráfico
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}