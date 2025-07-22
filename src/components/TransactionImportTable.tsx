import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Check, X, Edit2, Save, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Combobox } from './ui/combobox';
import TransactionIndicators from './TransactionIndicators';
import { supabase } from '@/integrations/supabase/client';
import type { TransactionRow } from '@/types/transaction';

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

interface TransactionImportTableProps {
  transactions: TransactionRow[];
  onTransactionsUpdate: (transactions: TransactionRow[]) => void;
}

// Função para normalizar e validar dados de transação
const normalizeAndValidateTransaction = (transaction: TransactionRow): TransactionRow => {
  const normalized = {
    ...transaction,
    // Garantir que subcategoryId seja sempre string ou undefined
    subcategoryId: typeof transaction.subcategoryId === 'string' 
      ? transaction.subcategoryId 
      : undefined,
    // Garantir que categoryId seja sempre string ou undefined
    categoryId: typeof transaction.categoryId === 'string' 
      ? transaction.categoryId 
      : undefined,
    // Garantir que description seja sempre string
    description: transaction.description || '',
    // Garantir que amount seja sempre number
    amount: typeof transaction.amount === 'number' ? transaction.amount : 0,
    // Garantir que type seja válido
    type: transaction.type === 'income' || transaction.type === 'expense' 
      ? transaction.type 
      : 'expense'
  };

  // Validar e limpar subcategoryId se for um objeto
  if (typeof transaction.subcategoryId === 'object' && transaction.subcategoryId !== null) {
    console.warn('🔧 [VALIDATION] Found object in subcategoryId, cleaning:', {
      transactionId: transaction.id,
      subcategoryId: transaction.subcategoryId
    });
    normalized.subcategoryId = undefined;
  }

  // Validar e limpar categoryId se for um objeto
  if (typeof transaction.categoryId === 'object' && transaction.categoryId !== null) {
    console.warn('🔧 [VALIDATION] Found object in categoryId, cleaning:', {
      transactionId: transaction.id,
      categoryId: transaction.categoryId
    });
    normalized.categoryId = undefined;
  }

  console.log('🔧 [VALIDATION] Transaction normalized:', {
    id: normalized.id,
    categoryId: normalized.categoryId,
    subcategoryId: normalized.subcategoryId,
    categoryIdValid: typeof normalized.categoryId === 'string' || normalized.categoryId === undefined,
    subcategoryIdValid: typeof normalized.subcategoryId === 'string' || normalized.subcategoryId === undefined
  });

  return normalized;
};

export default function TransactionImportTable({ 
  transactions, 
  onTransactionsUpdate 
}: TransactionImportTableProps) {
  const [tableData, setTableData] = useState<TransactionRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingSubcategories, setLoadingSubcategories] = useState(true);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkSubcategory, setBulkSubcategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const itemsPerPage = 50;

  // Load categories and subcategories
  useEffect(() => {
    console.log('🔍 [DEBUG] TransactionImportTable mounted, loading categories and subcategories...');
    loadCategories();
    loadSubcategories();
  }, []);

  // Initialize table data when transactions change with validation
  useEffect(() => {
    console.log('🔍 [DEBUG] transactions prop changed:', {
      length: transactions.length,
      firstTransaction: transactions[0],
      transactionsWithAI: transactions.filter((t: any) => t.aiSuggestion).length,
      sampleTransactions: transactions.slice(0, 3).map(t => ({
        id: t.id,
        description: t.description,
        categoryId: t.categoryId,
        subcategoryId: t.subcategoryId,
        hasAiSuggestion: !!t.aiSuggestion,
        categoryIdType: typeof t.categoryId,
        subcategoryIdType: typeof t.subcategoryId
      }))
    });
    
    // Normalizar e validar dados antes de processar
    const normalizedTransactions = transactions.map(normalizeAndValidateTransaction);
    
    const sortedData = [...normalizedTransactions]
      .sort((a, b) => {
        if (sortBy === 'date') {
          const comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          return sortOrder === 'asc' ? comparison : -comparison;
        } else {
          const comparison = a.amount - b.amount;
          return sortOrder === 'asc' ? comparison : -comparison;
        }
      });
    
    console.log('🔍 [DEBUG] sortedData after validation and processing:', {
      length: sortedData.length,
      firstTransactionWithAI: sortedData.find(t => t.aiSuggestion),
      transactionsWithAI: sortedData.filter(t => t.aiSuggestion).length,
      validatedData: sortedData.slice(0, 3).map(t => ({
        id: t.id,
        description: t.description,
        categoryId: t.categoryId,
        subcategoryId: t.subcategoryId,
        hasAiSuggestion: !!t.aiSuggestion,
        categoryIdType: typeof t.categoryId,
        subcategoryIdType: typeof t.subcategoryId
      }))
    });
    
    setTableData(sortedData);
  }, [transactions, sortBy, sortOrder]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      console.log('🔍 [DEBUG] Starting to load categories...');
      
      const { data: authData, error: authError } = await supabase.auth.getUser();
      console.log('👤 [DEBUG] Auth check result:', { 
        authData: authData?.user?.id ? 'User authenticated' : 'No user',
        authError: authError?.message || 'No auth error',
        userId: authData?.user?.id
      });
      
      if (authError) {
        console.error('❌ Authentication error:', authError);
        return;
      }
      
      if (!authData.user) {
        console.log('❌ No authenticated user found');
        return;
      }

      console.log('📊 Fetching categories from database...');
      const { data, error, status, statusText } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      console.log('📋 Categories query complete:', { 
        dataExists: !!data,
        dataLength: data?.length || 0, 
        error: error?.message || 'No error',
        status,
        statusText
      });
      
      if (error) {
        console.error('❌ Error loading categories:', error);
        return;
      }
      
      if (!data) {
        console.warn('⚠️ Categories data is null/undefined');
        return;
      }

      if (data.length === 0) {
        console.warn('⚠️ No categories found in database');
        setCategories([]);
        return;
      }
      
      setCategories(data as Category[]);
      console.log('✅ Categories loaded and set successfully:', data.length, 'categories');
    } catch (error) {
      console.error('💥 Exception in loadCategories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadSubcategories = async () => {
    try {
      setLoadingSubcategories(true);
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error loading subcategories:', error);
        return;
      }
      
      if (data) {
        setSubcategories(data);
        console.log('Subcategories loaded successfully:', data.length, 'subcategories');
      }
    } catch (error) {
      console.error('Failed to load subcategories:', error);
    } finally {
      setLoadingSubcategories(false);
    }
  };

  // Função de atualização robusta com validação
  const updateTransaction = useCallback((id: string, updates: Partial<TransactionRow>) => {
    console.log('🔄 [UPDATE] updateTransaction called:', { 
      id, 
      updates,
      updatesKeys: Object.keys(updates),
      categoryIdUpdate: updates.categoryId,
      subcategoryIdUpdate: updates.subcategoryId,
      categoryIdType: typeof updates.categoryId,
      subcategoryIdType: typeof updates.subcategoryId
    });
    
    setTableData(prev => {
      const updated = prev.map(t => {
        if (t.id === id) {
          // Criar nova instância da transação com validação
          const updatedTransaction = normalizeAndValidateTransaction({
            ...t,
            ...updates,
            // Garantir que IDs sejam strings válidas ou undefined
            categoryId: typeof updates.categoryId === 'string' && updates.categoryId !== '' 
              ? updates.categoryId 
              : (updates.categoryId === '' ? undefined : t.categoryId),
            subcategoryId: typeof updates.subcategoryId === 'string' && updates.subcategoryId !== '' 
              ? updates.subcategoryId 
              : (updates.subcategoryId === '' ? undefined : t.subcategoryId)
          });
          
          console.log('🔄 [UPDATE] Transaction updated:', {
            id,
            before: {
              categoryId: t.categoryId,
              subcategoryId: t.subcategoryId,
            },
            after: {
              categoryId: updatedTransaction.categoryId,
              subcategoryId: updatedTransaction.subcategoryId,
            },
            updates: updates
          });
          
          return updatedTransaction;
        }
        return t;
      });
      
      console.log('🔍 [UPDATE] updateTransaction result:', {
        updatedTransaction: updated.find(t => t.id === id),
        transactionsWithAI: updated.filter(t => t.aiSuggestion).length
      });
      
      onTransactionsUpdate(updated);
      return updated;
    });
  }, [onTransactionsUpdate]);

  const toggleRowSelection = useCallback((id: string) => {
    setSelectedRows(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  }, []);

  const toggleAllSelection = useCallback(() => {
    const currentPageIds = getCurrentPageData().map(t => t.id);
    const allSelected = currentPageIds.every(id => selectedRows.has(id));
    
    setSelectedRows(prev => {
      const newSelected = new Set(prev);
      if (allSelected) {
        currentPageIds.forEach(id => newSelected.delete(id));
      } else {
        currentPageIds.forEach(id => newSelected.add(id));
      }
      return newSelected;
    });
  }, [selectedRows]);

  const applyBulkCategory = useCallback(() => {
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
  }, [bulkCategory, bulkSubcategory, selectedRows, updateTransaction]);

  // Função otimizada para filtrar subcategorias
  const getFilteredSubcategories = useCallback((categoryId: string) => {
    if (!categoryId) return [];
    const filtered = subcategories.filter(sub => sub.category_id === categoryId);
    console.log('🔍 [SUBCATEGORIES] getFilteredSubcategories:', {
      categoryId,
      totalSubcategories: subcategories.length,
      filteredCount: filtered.length,
      filtered: filtered.slice(0, 3).map(s => ({ id: s.id, name: s.name }))
    });
    return filtered;
  }, [subcategories]);

  const getCurrentPageData = useCallback(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return tableData.slice(startIndex, endIndex);
  }, [tableData, currentPage, itemsPerPage]);

  // Opções memoizadas para melhor performance
  const categoryOptions = useMemo(() => {
    const options = categories.map(cat => ({
      value: cat.id,
      label: cat.name
    }));
    console.log('🎯 [CATEGORIES] Category options memoized:', options.length);
    return options;
  }, [categories]);

  const totalPages = Math.ceil(tableData.length / itemsPerPage);
  
  const totalEntrada = tableData
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalSaida = tableData
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const diferenca = totalEntrada - totalSaida;
  
  const calculatePaymentMethodTotal = (keyword: string) => {
    return tableData
      .filter(t => t.type === 'expense' && t.description.toLowerCase().includes(keyword.toLowerCase()))
      .reduce((sum, t) => sum + t.amount, 0);
  };
  
  const totalPix = calculatePaymentMethodTotal('pix');
  const totalCredito = calculatePaymentMethodTotal('crédito') + calculatePaymentMethodTotal('credito');
  const totalDebito = calculatePaymentMethodTotal('débito') + calculatePaymentMethodTotal('debito');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  // Enhanced function to check if transaction needs attention
  const needsAttention = useCallback((transaction: TransactionRow) => {
    // Missing category or subcategory
    if (!transaction.categoryId || !transaction.subcategoryId) {
      return true;
    }
    
    // Low AI confidence (below 50%)
    if (transaction.aiSuggestion && transaction.aiSuggestion.confidence < 0.5) {
      return true;
    }
    
    return false;
  }, []);

  return (
    <div className="space-y-6">
      {/* Statistics - Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">
              {formatCurrency(totalEntrada)}
            </div>
            <div className="text-sm text-muted-foreground">Valor Entrada</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(totalSaida)}
            </div>
            <div className="text-sm text-muted-foreground">Valor Saída</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={`text-2xl font-bold ${diferenca >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(diferenca)}
            </div>
            <div className="text-sm text-muted-foreground">Diferença</div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics - Métodos de Pagamento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalPix)}
            </div>
            <div className="text-sm text-muted-foreground">PIX</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalCredito)}
            </div>
            <div className="text-sm text-muted-foreground">Crédito</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalDebito)}
            </div>
            <div className="text-sm text-muted-foreground">Débito</div>
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
              
              <Combobox
                value={bulkCategory}
                onValueChange={setBulkCategory}
                options={categoryOptions}
                placeholder="Selecionar categoria"
                searchPlaceholder="Buscar categoria..."
                emptyText="Nenhuma categoria encontrada"
                width="w-60"
              />

              <Combobox
                value={bulkSubcategory}
                onValueChange={setBulkSubcategory}
                options={getFilteredSubcategories(bulkCategory).map(sub => ({
                  value: sub.id,
                  label: sub.name
                }))}
                placeholder="Selecionar subcategoria"
                disabled={!bulkCategory}
                searchPlaceholder="Buscar subcategoria..."
                emptyText="Nenhuma subcategoria encontrada"
                width="w-60"
              />

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
                    className="cursor-pointer w-24"
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
                    className="cursor-pointer w-32"
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
                  <TableHead className="w-80">Descrição</TableHead>
                  <TableHead className="w-40">Indicadores</TableHead>
                  <TableHead className="w-64">Categoria</TableHead>
                  <TableHead className="w-64">Subcategoria</TableHead>
                  <TableHead className="w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getCurrentPageData().map(transaction => {
                  console.log(`🔍 [RENDER] Rendering transaction ${transaction.id}:`, {
                    hasAISuggestion: !!transaction.aiSuggestion,
                    categoryId: transaction.categoryId,
                    subcategoryId: transaction.subcategoryId,
                    description: transaction.description,
                    categoryIdType: typeof transaction.categoryId,
                    subcategoryIdType: typeof transaction.subcategoryId
                  });
                  
                  const category = categories.find(c => c.id === transaction.categoryId);
                  const subcategory = subcategories.find(s => s.id === transaction.subcategoryId);
                  const requiresAttention = needsAttention(transaction);
                  
                  return (
                    <TableRow 
                      key={transaction.id}
                      className={`
                        ${requiresAttention ? 'bg-yellow-50 border-l-4 border-l-yellow-400' : 'bg-white'}
                        ${selectedRows.has(transaction.id) ? 'bg-primary/5' : ''}
                        transition-colors duration-200
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
                          <div className="max-w-xs" title={transaction.description}>
                            <span className="block truncate">{transaction.description}</span>
                            {requiresAttention && (
                              <div className="flex items-center gap-1 mt-1">
                                <AlertCircle className="h-3 w-3 text-yellow-600" />
                                <span className="text-xs text-yellow-600">Requer atenção</span>
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <TransactionIndicators transaction={transaction} />
                      </TableCell>
                      
                      <TableCell>
                        <Combobox
                          key={`category-${transaction.id}-${transaction.categoryId || 'empty'}-${Date.now()}`}
                          value={transaction.categoryId || ''}
                          onValueChange={(value) => {
                            console.log('🔄 [CATEGORY] Category selection changed:', { 
                              transactionId: transaction.id, 
                              oldValue: transaction.categoryId,
                              newValue: value,
                              valueType: typeof value,
                              availableCategories: categories.length 
                            });
                            updateTransaction(transaction.id, {
                              categoryId: value,
                              subcategoryId: undefined, // Reset subcategory when category changes
                              aiSuggestion: transaction.aiSuggestion ? {
                                ...transaction.aiSuggestion,
                                isAISuggested: false // Mark as manually modified
                              } : undefined
                            });
                          }}
                          options={categoryOptions}
                          placeholder={loadingCategories ? "Carregando..." : "Selecionar categoria"}
                          searchPlaceholder="Buscar categoria..."
                          emptyText={loadingCategories ? "Carregando..." : "Nenhuma categoria encontrada"}
                          width="w-60"
                          disabled={loadingCategories}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Combobox
                          key={`subcategory-${transaction.id}-${transaction.categoryId || 'empty'}-${transaction.subcategoryId || 'empty'}-${Date.now()}`}
                          value={transaction.subcategoryId || ''}
                          onValueChange={(value) => {
                            console.log('🔄 [SUBCATEGORY] Subcategory selection changed:', { 
                              transactionId: transaction.id, 
                              oldValue: transaction.subcategoryId,
                              newValue: value,
                              valueType: typeof value,
                              categoryId: transaction.categoryId
                            });
                            updateTransaction(transaction.id, {
                              subcategoryId: value
                            });
                          }}
                          options={getFilteredSubcategories(transaction.categoryId || '').map(sub => ({
                            value: sub.id,
                            label: sub.name
                          }))}
                          placeholder="Selecionar subcategoria"
                          disabled={!transaction.categoryId || loadingSubcategories}
                          searchPlaceholder="Buscar subcategoria..."
                          emptyText="Nenhuma subcategoria encontrada"
                          width="w-60"
                        />
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
