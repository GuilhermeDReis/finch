import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Edit2, Save, X, Bot, Sparkles, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { TransactionRow, RefundedTransaction, UnifiedPixTransaction } from '@/types/transaction';
import GroupedTransactionRow from './GroupedTransactionRow';

interface TransactionImportTableProps {
  transactions: TransactionRow[];
  refundedTransactions?: RefundedTransaction[];
  unifiedPixTransactions?: UnifiedPixTransaction[];
  onTransactionsUpdate: (transactions: TransactionRow[]) => void;
}

// Create a unified type for rendering
type RenderableTransaction = TransactionRow | RefundedTransaction | UnifiedPixTransaction;

export default function TransactionImportTable({
  transactions,
  refundedTransactions = [],
  unifiedPixTransactions = [],
  onTransactionsUpdate
}: TransactionImportTableProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState('');
  const [allSelected, setAllSelected] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao carregar categorias",
          description: error.message,
        });
      } else {
        setCategories(data || []);
      }
    };

    const loadSubcategories = async () => {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .order('name');

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao carregar subcategorias",
          description: error.message,
        });
      } else {
        setSubcategories(data || []);
      }
    };

    loadCategories();
    loadSubcategories();
  }, [toast]);

  // Create a unified list of all transactions sorted by date
  const allTransactions: RenderableTransaction[] = React.useMemo(() => {
    const unified: RenderableTransaction[] = [
      ...transactions,
      ...refundedTransactions,
      ...unifiedPixTransactions
    ];

    // Sort by date
    return unified.sort((a, b) => {
      const dateA = 'date' in a ? new Date(a.date) : 
                   'originalTransaction' in a ? new Date(a.originalTransaction.date) :
                   new Date(a.pixTransaction.date);
      const dateB = 'date' in b ? new Date(b.date) : 
                   'originalTransaction' in b ? new Date(b.originalTransaction.date) :
                   new Date(b.pixTransaction.date);
      
      return dateB.getTime() - dateA.getTime(); // Most recent first
    });
  }, [transactions, refundedTransactions, unifiedPixTransactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setAllSelected(checked);
    const updatedTransactions = transactions.map(transaction => ({
      ...transaction,
      selected: checked,
    }));
    onTransactionsUpdate(updatedTransactions);
  };

  const handleSelectTransaction = (id: string) => {
    const updatedTransactions = transactions.map(transaction => {
      if (transaction.id === id) {
        return { ...transaction, selected: !transaction.selected };
      }
      return transaction;
    });
    onTransactionsUpdate(updatedTransactions);
  };

  const handleCategoryChange = (id: string, categoryId: string) => {
    const updatedTransactions = transactions.map(transaction => {
      if (transaction.id === id) {
        return { ...transaction, categoryId, subcategoryId: undefined };
      }
      return transaction;
    });
    onTransactionsUpdate(updatedTransactions);
  };

  const handleSubcategoryChange = (id: string, subcategoryId: string) => {
    const updatedTransactions = transactions.map(transaction => {
      if (transaction.id === id) {
        return { ...transaction, subcategoryId };
      }
      return transaction;
    });
    onTransactionsUpdate(updatedTransactions);
  };

  const handleEditDescription = (id: string, description: string) => {
    setEditingId(id);
    setEditingDescription(description);
  };

  const handleSaveEdit = (id: string) => {
    const updatedTransactions = transactions.map(transaction => {
      if (transaction.id === id) {
        return { ...transaction, editedDescription: editingDescription };
      }
      return transaction;
    });
    onTransactionsUpdate(updatedTransactions);
    setEditingId(null);
    setEditingDescription('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingDescription('');
  };

  const getStats = () => {
    const categorized = transactions.filter(t => t.categoryId).length;
    const uncategorized = transactions.length - categorized;
    
    // Calculate totals including unified PIX transactions
    const transactionValue = transactions.reduce((sum, t) => sum + (t.type === 'expense' ? -t.amount : t.amount), 0);
    const unifiedPixValue = unifiedPixTransactions.reduce((sum, t) => sum - t.pixTransaction.amount, 0); // Always negative (expense)
    
    const totalValue = transactionValue + unifiedPixValue;

    return { categorized, uncategorized, totalValue };
  };

  const stats = getStats();

  return (
    <div className="space-y-4">
      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transações para Importar</span>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-600">
                Total: {formatCurrency(stats.totalValue)}
              </span>
              <span className="text-blue-600">
                Categorizadas: {stats.categorized}
              </span>
              <span className="text-orange-600">
                Pendentes: {stats.uncategorized}
              </span>
            </div>
          </CardTitle>
          <CardDescription>
            Revise as transações abaixo e categorize antes de importar. 
            Transações em cinza são agrupamentos automáticos que não afetam os totais.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    disabled={transactions.length === 0}
                  />
                </TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Subcategoria</TableHead>
                <TableHead>IA</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allTransactions.map((transaction) => {
                // Check if this is a grouped transaction
                if ('status' in transaction && (transaction.status === 'refunded' || transaction.status === 'unified-pix')) {
                  return (
                    <GroupedTransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      formatCurrency={formatCurrency}
                      formatDate={formatDate}
                    />
                  );
                }

                // Regular transaction row
                const regularTransaction = transaction as TransactionRow;
                return (
                  <TableRow key={regularTransaction.id} className={regularTransaction.selected ? 'bg-blue-50' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={regularTransaction.selected}
                        onCheckedChange={() => handleSelectTransaction(regularTransaction.id)}
                      />
                    </TableCell>
                    
                    <TableCell className="font-mono text-sm">
                      {formatDate(regularTransaction.date)}
                    </TableCell>
                    
                    <TableCell>
                      <span className={`font-semibold ${regularTransaction.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                        {regularTransaction.type === 'expense' ? '-' : '+'}
                        {formatCurrency(regularTransaction.amount)}
                      </span>
                    </TableCell>
                    
                    <TableCell>
                      {editingId === regularTransaction.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            className="w-full"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(regularTransaction.id)}
                            className="px-2"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            className="px-2"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="max-w-xs truncate">
                            {regularTransaction.editedDescription || regularTransaction.description}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditDescription(regularTransaction.id, regularTransaction.editedDescription || regularTransaction.description)}
                            className="px-2"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <Select
                        value={regularTransaction.categoryId || ''}
                        onValueChange={(value) => handleCategoryChange(regularTransaction.id, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecionar categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories
                            .filter(cat => cat.type === regularTransaction.type)
                            .map(category => (
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
                    </TableCell>

                    <TableCell>
                      <Select
                        value={regularTransaction.subcategoryId || ''}
                        onValueChange={(value) => handleSubcategoryChange(regularTransaction.id, value)}
                        disabled={!regularTransaction.categoryId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Subcategoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {subcategories
                            .filter(sub => sub.category_id === regularTransaction.categoryId)
                            .map(subcategory => (
                              <SelectItem key={subcategory.id} value={subcategory.id}>
                                {subcategory.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell>
                      {regularTransaction.aiSuggestion && (
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {regularTransaction.aiSuggestion.usedFallback ? (
                              <AlertCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <Bot className="h-3 w-3 mr-1" />
                            )}
                            {Math.round(regularTransaction.aiSuggestion.confidence * 100)}%
                          </Badge>
                          {regularTransaction.aiSuggestion.confidence > 0.7 && (
                            <Sparkles className="h-3 w-3 text-yellow-500" />
                          )}
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditDescription(regularTransaction.id, regularTransaction.editedDescription || regularTransaction.description)}
                          className="px-2"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
