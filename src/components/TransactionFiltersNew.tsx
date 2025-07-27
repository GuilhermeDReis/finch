import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Transaction } from '@/types/transaction';

interface TransactionFilters {
  year: string;
  month: string;
  category: string;
  subcategory: string;
  description: string;
}

interface TransactionFiltersNewProps {
  transactions: Transaction[];
  categories: any[];
  subcategories: any[];
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
}

export function TransactionFiltersNew({ 
  transactions, 
  categories,
  subcategories,
  filters, 
  onFiltersChange 
}: TransactionFiltersNewProps) {
  const [availableSubcategories, setAvailableSubcategories] = useState<any[]>([]);

  // Obter anos únicos das transações
  const years = Array.from(
    new Set(transactions.map(t => format(t.date, 'yyyy')))
  ).sort((a, b) => Number(b) - Number(a));

  const months = [
    { value: 'all', label: 'Todos os meses' },
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  useEffect(() => {
    if (filters.category !== 'all') {
      const filteredSubs = subcategories.filter(sub => sub.category_id === filters.category);
      setAvailableSubcategories(filteredSubs);
    } else {
      setAvailableSubcategories([]);
    }
  }, [filters.category, subcategories]);

  const handleFilterChange = (key: keyof TransactionFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    
    // Reset subcategory when category changes
    if (key === 'category' && value !== filters.category) {
      newFilters.subcategory = 'all';
    }
    
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    onFiltersChange({
      year: '2025',
      month: 'all',
      category: 'all',
      subcategory: 'all',
      description: ''
    });
  };

  const activeFiltersCount = Object.entries(filters).filter(
    ([key, value]) => key !== 'description' && value !== 'all' && value !== ''
  ).length + (filters.description ? 1 : 0);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Filtros</h3>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFiltersCount} ativo{activeFiltersCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          Limpar filtros
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Ano */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Ano</label>
          <Select value={filters.year} onValueChange={(value) => handleFilterChange('year', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mês */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Mês</label>
          <Select value={filters.month} onValueChange={(value) => handleFilterChange('month', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map(month => (
                <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Categoria */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Categoria</label>
          <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subcategoria */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Subcategoria</label>
          <Select 
            value={filters.subcategory} 
            onValueChange={(value) => handleFilterChange('subcategory', value)}
            disabled={!filters.category || filters.category === 'all'}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as subcategorias</SelectItem>
              {availableSubcategories.map(subcategory => (
                <SelectItem key={subcategory.id} value={subcategory.id}>
                  {subcategory.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Busca por descrição */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar descrição..."
              value={filters.description}
              onChange={(e) => handleFilterChange('description', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
