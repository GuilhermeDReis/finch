import { Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { Transaction } from '@/types/transaction';

interface TransactionTableProps {
  transactions: Transaction[];
  categories: any[];
  subcategories: any[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
}

export function TransactionTable({ 
  transactions, 
  categories,
  subcategories,
  onEdit, 
  onDelete, 
  currentPage, 
  onPageChange,
  itemsPerPage = 25 
}: TransactionTableProps) {
  // Paginação
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = transactions.slice(startIndex, startIndex + itemsPerPage);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories?.find(cat => cat.id === categoryId);
    return category?.name || 'Sem categoria';
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories?.find(cat => cat.id === categoryId);
    return category?.color || '#6B7280';
  };

  const getSubcategoryName = (subcategoryId: string) => {
    const subcategory = subcategories?.find(sub => sub.id === subcategoryId);
    return subcategory?.name || undefined;
  };

  const truncateText = (text: string, maxLength: number = 30) => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const getTypeLabel = (type: 'income' | 'expense') => {
    return type === 'income' ? 'Receita' : 'Despesa';
  };

  return (
    <Card className="p-6">
      {/* Tabela Desktop */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Subcategoria</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhuma transação encontrada. Tente ajustar os filtros ou adicione uma nova transação.
                </TableCell>
              </TableRow>
            ) : (
              paginatedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">
                    {format(transaction.date, 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs" title={transaction.description}>
                      <span className="block truncate">{transaction.description}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={transaction.type === 'income' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {getTypeLabel(transaction.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      style={{ 
                        borderColor: getCategoryColor(transaction.category_id),
                        color: getCategoryColor(transaction.category_id)
                      }}
                    >
                      {getCategoryName(transaction.category_id)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getSubcategoryName(transaction.subcategory || '') ? (
                      <Badge variant="secondary" className="text-xs">
                        {getSubcategoryName(transaction.subcategory || '')}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`font-semibold ${
                      transaction.type === 'income' ? 'text-success' : 'text-destructive'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(transaction)}
                        title="Editar transação"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(transaction.id)}
                        className="text-destructive hover:text-destructive"
                        title="Excluir transação"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Cards Mobile */}
      <div className="md:hidden space-y-4">
        {paginatedTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma transação encontrada. Tente ajustar os filtros ou adicione uma nova transação.
          </div>
        ) : (
          paginatedTransactions.map((transaction) => (
            <Card key={transaction.id} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold">{truncateText(transaction.description, 25)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(transaction.date, 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(transaction)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(transaction.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Badge 
                    variant={transaction.type === 'income' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {getTypeLabel(transaction.type)}
                  </Badge>
                  <span className={`font-semibold ${
                    transaction.type === 'income' ? 'text-success' : 'text-destructive'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <Badge 
                    variant="outline"
                    style={{ 
                      borderColor: getCategoryColor(transaction.category_id),
                      color: getCategoryColor(transaction.category_id)
                    }}
                  >
                    {getCategoryName(transaction.category_id)}
                  </Badge>
                  {getSubcategoryName(transaction.subcategory || '') ? (
                    <Badge variant="secondary" className="text-xs">
                      {getSubcategoryName(transaction.subcategory || '')}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-muted-foreground">
            Exibindo {startIndex + 1}-{Math.min(startIndex + itemsPerPage, transactions.length)} de {transactions.length} transações
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            
            <span className="text-sm">
              Página {currentPage} de {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
