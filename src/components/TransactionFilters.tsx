
import React from 'react';
import { Card, CardContent } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { X } from 'lucide-react';

interface TransactionFiltersProps {
  filters: {
    paymentMethod: string;
    type: string;
  };
  onFilterChange: (filterType: string, value: string) => void;
  onClearFilters: () => void;
  totalFiltered: number;
  totalAll: number;
}

export default function TransactionFilters({ 
  filters, 
  onFilterChange, 
  onClearFilters, 
  totalFiltered, 
  totalAll 
}: TransactionFiltersProps) {
  const hasActiveFilters = filters.paymentMethod !== 'all' || filters.type !== 'all';

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filtros:</span>
            
            <Select value={filters.type} onValueChange={(value) => onFilterChange('type', value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Entrada</SelectItem>
                <SelectItem value="expense">Saída</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.paymentMethod} onValueChange={(value) => onFilterChange('paymentMethod', value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="credito">Crédito</SelectItem>
                <SelectItem value="debito">Débito</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Limpar
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" size="sm">
              {totalFiltered} de {totalAll} transações
            </Badge>
            
            {hasActiveFilters && (
              <div className="flex gap-1">
                {filters.type !== 'all' && (
                  <Badge variant="secondary" size="sm">
                    {filters.type === 'income' ? 'Entrada' : 'Saída'}
                  </Badge>
                )}
                {filters.paymentMethod !== 'all' && (
                  <Badge variant="secondary" size="sm">
                    {filters.paymentMethod.toUpperCase()}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
