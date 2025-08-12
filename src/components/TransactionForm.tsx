import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CalendarIcon, Plus, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { TransactionFormData, TransactionType, PaymentMethod, RecurringFrequency } from '@/types/transaction';
import { incomeCategories, expenseCategories, incomePaymentMethods, expensePaymentMethods } from '@/data/mockData';

interface TransactionFormProps {
  type: TransactionType;
  onSubmit: (data: TransactionFormData) => void;
}

export function TransactionForm({ type, onSubmit }: TransactionFormProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid }
  } = useForm<TransactionFormData>({
    defaultValues: {
      type,
      amount: '',
      description: '',
      category_id: '',
      date: new Date(),
      payment_method: type === 'income' ? 'Transferência' : 'Cartão de Crédito',
      tags: [],
      is_recurring: false,
    }
  });

  const categories = type === 'income' ? incomeCategories : expenseCategories;
  const paymentMethods = type === 'income' ? incomePaymentMethods : expensePaymentMethods;

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      setValue('tags', newTags);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    setValue('tags', newTags);
  };

  const handleFormSubmit = (data: TransactionFormData) => {
    const formattedData = {
      ...data,
      type,
      date,
      tags,
      is_recurring: isRecurring,
      amount: data.amount.replace(/[^\d,]/g, '').replace(',', '.')
    };
    onSubmit(formattedData);
    handleReset();
  };

  const handleReset = () => {
    reset();
    setDate(new Date());
    setTags([]);
    setTagInput('');
    setIsRecurring(false);
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    const formattedValue = (Number(numericValue) / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
    return formattedValue;
  };

  const quickAmounts = type === 'income' 
    ? [1000, 2000, 5000, 10000] 
    : [10, 50, 100, 500];

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Quick Amount Buttons */}
        <div className="flex flex-wrap gap-2">
          <Label className="text-sm font-medium text-muted-foreground">Valores rápidos:</Label>
          {quickAmounts.map((amount) => (
            <Button
              key={amount}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setValue('amount', formatCurrency(amount.toString()))}
              className="h-7"
            >
              {formatCurrency(amount.toString())}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor *</Label>
            <Input
              id="amount"
              {...register('amount', { 
                required: 'Valor é obrigatório',
                validate: (value) => {
                  const numericValue = Number(value.replace(/[^\d,]/g, '').replace(',', '.'));
                  return numericValue > 0 || 'Valor deve ser maior que zero';
                }
              })}
              placeholder="R$ 0,00"
              onChange={(e) => {
                const formatted = formatCurrency(e.target.value);
                setValue('amount', formatted);
              }}
              className={cn(errors.amount && "border-destructive")}
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              {...register('description', { 
                required: 'Descrição é obrigatória',
                maxLength: { value: 255, message: 'Máximo 255 caracteres' }
              })}
              placeholder={type === 'income' ? "Ex: Salário de Janeiro" : "Ex: Compras no supermercado"}
              className={cn(errors.description && "border-destructive")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label htmlFor="category_id">Categoria *</Label>
            <Select onValueChange={(value) => setValue('category_id', value)}>
              <SelectTrigger className={cn(errors.category_id && "border-destructive")}>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
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

          {/* Subcategoria */}
          <div className="space-y-2">
            <Label htmlFor="subcategory">Subcategoria</Label>
            <Input
              id="subcategory"
              {...register('subcategory')}
              placeholder={type === 'income' ? "Ex: Salário base, Horas extras" : "Ex: Supermercado, Restaurante"}
            />
          </div>

          {/* Data */}
          <div className="space-y-2">
            <Label>Data *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(selectedDate) => {
                    if (selectedDate) {
                      setDate(selectedDate);
                      setValue('date', selectedDate);
                    }
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Método de Pagamento */}
          <div className="space-y-2">
            <Label htmlFor="payment_method">
              {type === 'income' ? 'Método de Recebimento' : 'Método de Pagamento'} *
            </Label>
            <Select onValueChange={(value) => setValue('payment_method', value as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o método" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-3">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                {tag}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => removeTag(tag)}
                />
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Adicione uma tag..."
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            />
            <Button type="button" variant="outline" size="icon" onClick={addTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Observações */}
        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            {...register('notes')}
            placeholder="Observações adicionais..."
            rows={3}
          />
        </div>

        {/* Recorrente */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_recurring"
              checked={isRecurring}
              onCheckedChange={(checked) => {
                setIsRecurring(checked as boolean);
                setValue('is_recurring', checked as boolean);
              }}
            />
            <Label htmlFor="is_recurring">Transação recorrente</Label>
          </div>

            {isRecurring && (
              <div className="space-y-2">
                <Label htmlFor="recurring_frequency">Frequência</Label>
                <Select onValueChange={(value) => setValue('recurring_frequency', value as RecurringFrequency)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a frequência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            type="submit"
            disabled={!isValid}
            className={cn(
              "flex-1",
              type === 'income' 
                ? "bg-success hover:bg-success/90" 
                : "bg-destructive hover:bg-destructive/90"
            )}
          >
            {type === 'income' ? 'Cadastrar Receita' : 'Cadastrar Gasto'}
          </Button>
          <Button type="button" variant="outline" onClick={handleReset}>
            Limpar
          </Button>
        </div>
      </form>
    </Card>
  );
}