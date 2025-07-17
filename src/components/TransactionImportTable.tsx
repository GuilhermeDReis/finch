import React, { useState, useEffect } from 'react';
import { Check, X, Edit2, Save, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface ParsedTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  originalDescription: string;
  type: 'income' | 'expense';
}

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon?: string;
  created_at?: string;
  updated_at?: string;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

interface TransactionRow extends ParsedTransaction {
  categoryId?: string;
  subcategoryId?: string;
  editedDescription?: string;
  isEditing?: boolean;
  selected?: boolean;
}

interface TransactionImportTableProps {
  transactions: ParsedTransaction[];
  onTransactionsUpdate: (transactions: TransactionRow[]) => void;
}

export default function TransactionImportTable({ 
  transactions, 
  onTransactionsUpdate 
}: TransactionImportTableProps) {
  const [tableData, setTableData] = useState<TransactionRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkSubcategory, setBulkSubcategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const itemsPerPage = 50;

  // Load categories and subcategories
  useEffect(() => {
    loadCategories();
    loadSubcategories();
  }, []);

  // Initialize table data
  useEffect(() => {
    const sortedData = [...transactions]
      .map(t => ({ ...t, selected: false }))
      .sort((a, b) => {
        if (sortBy === 'date') {
          const comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          return sortOrder === 'asc' ? comparison : -comparison;
        } else {
          const comparison = a.amount - b.amount;
          return sortOrder === 'asc' ? comparison : -comparison;
        }
      });
    
    setTableData(sortedData);
    onTransactionsUpdate(sortedData);
  }, [transactions, sortBy, sortOrder]);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (!error && data) {
      setCategories(data as Category[]);
    }
  };

  const loadSubcategories = async () => {
    const { data, error } = await supabase
      .from('subcategories')
      .select('*')
      .order('name');
    
    if (!error && data) {
      setSubcategories(data);
    }
  };

  const updateTransaction = (id: string, updates: Partial<TransactionRow>) => {
    setTableData(prev => {
      const updated = prev.map(t => 
        t.id === id ? { ...t, ...updates } : t
      );
      onTransactionsUpdate(updated);
      return updated;
    });
  };

  const toggleRowSelection = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllSelection = () => {
    const currentPageIds = getCurrentPageData().map(t => t.id);
    const allSelected = currentPageIds.every(id => selectedRows.has(id));
    
    const newSelected = new Set(selectedRows);
    if (allSelected) {
      currentPageIds.forEach(id => newSelected.delete(id));
    } else {
      currentPageIds.forEach(id => newSelected.add(id));
    }
    setSelectedRows(newSelected);
  };

  const applyBulkCategory = () => {
    if (!bulkCategory) return;
    
    selectedRows.forEach(id => {
      updateTransaction(id, {
        categoryId: bulkCategory,
        subcategoryId: bulkSubcategory || undefined
      });
    });
    
    setBulkCategory('');
    setBulkSubcategory('');
    setSelectedRows(new Set());
  };

  const getFilteredSubcategories = (categoryId: string) => {
    return subcategories.filter(sub => sub.category_id === categoryId);
  };

  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return tableData.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(tableData.length / itemsPerPage);
  const uncategorizedCount = tableData.filter(t => !t.categoryId).length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{tableData.length}</div>
            <div className="text-sm text-muted-foreground">Total de transações</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">{uncategorizedCount}</div>
            <div className="text-sm text-muted-foreground">Sem categoria</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">
              {tableData.filter(t => t.type === 'income').length}
            </div>
            <div className="text-sm text-muted-foreground">Receitas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">
              {tableData.filter(t => t.type === 'expense').length}
            </div>
            <div className="text-sm text-muted-foreground">Gastos</div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {selectedRows.size > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center gap-4 flex-wrap">
              <span>{selectedRows.size} item(s) selecionado(s)</span>
              
              <Select value={bulkCategory} onValueChange={setBulkCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {bulkCategory && (
                <Select value={bulkSubcategory} onValueChange={setBulkSubcategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Subcategoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {getFilteredSubcategories(bulkCategory).map(sub => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button onClick={applyBulkCategory} disabled={!bulkCategory}>
                Aplicar Categoria
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setSelectedRows(new Set())}
              >
                Limpar Seleção
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transações para Importar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={getCurrentPageData().length > 0 && getCurrentPageData().every(t => selectedRows.has(t.id))}
                      onCheckedChange={toggleAllSelection}
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => {
                      if (sortBy === 'date') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('date');
                        setSortOrder('desc');
                      }
                    }}
                  >
                    Data {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => {
                      if (sortBy === 'amount') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('amount');
                        setSortOrder('desc');
                      }
                    }}
                  >
                    Valor {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Subcategoria</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getCurrentPageData().map(transaction => {
                  const category = categories.find(c => c.id === transaction.categoryId);
                  const subcategory = subcategories.find(s => s.id === transaction.subcategoryId);
                  
                  return (
                    <TableRow 
                      key={transaction.id}
                      className={`
                        ${!transaction.categoryId ? 'bg-warning/10' : ''}
                        ${selectedRows.has(transaction.id) ? 'bg-primary/5' : ''}
                      `}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(transaction.id)}
                          onCheckedChange={() => toggleRowSelection(transaction.id)}
                        />
                      </TableCell>
                      
                      <TableCell className="font-mono text-sm">
                        {formatDate(transaction.date)}
                      </TableCell>
                      
                      <TableCell>
                        <span className={`font-semibold ${
                          transaction.type === 'income' ? 'text-success' : 'text-destructive'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </span>
                      </TableCell>
                      
                      <TableCell>
                        {transaction.isEditing ? (
                          <Input
                            value={transaction.editedDescription || transaction.description}
                            onChange={(e) => updateTransaction(transaction.id, {
                              editedDescription: e.target.value
                            })}
                            onBlur={() => updateTransaction(transaction.id, {
                              isEditing: false,
                              description: transaction.editedDescription || transaction.description
                            })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateTransaction(transaction.id, {
                                  isEditing: false,
                                  description: transaction.editedDescription || transaction.description
                                });
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <div className="max-w-xs truncate" title={transaction.description}>
                            {transaction.description}
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Select
                          value={transaction.categoryId || ''}
                          onValueChange={(value) => updateTransaction(transaction.id, {
                            categoryId: value,
                            subcategoryId: undefined // Reset subcategory when category changes
                          })}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Selecionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories
                              .filter(cat => cat.type === transaction.type)
                              .map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: cat.color }}
                                    />
                                    {cat.name}
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      
                      <TableCell>
                        {transaction.categoryId && (
                          <Select
                            value={transaction.subcategoryId || ''}
                            onValueChange={(value) => updateTransaction(transaction.id, {
                              subcategoryId: value
                            })}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Opcional" />
                            </SelectTrigger>
                            <SelectContent>
                              {getFilteredSubcategories(transaction.categoryId).map(sub => (
                                <SelectItem key={sub.id} value={sub.id}>
                                  {sub.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateTransaction(transaction.id, {
                            isEditing: !transaction.isEditing,
                            editedDescription: transaction.description
                          })}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages} 
                ({tableData.length} transações no total)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}