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
import { useTransactionIntegrity } from '@/hooks/useTransactionIntegrity';
import { 
  validateAndFixDuplicateIds,
  createIsolatedTransaction,
  verifyTransactionIntegrity,
  generateStableKey
} from '@/utils/transactionIntegrity';
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

// Enhanced normalization with integrity checks
const normalizeAndValidateTransaction = (transaction: TransactionRow): TransactionRow => {
  const normalized = createIsolatedTransaction(transaction);
  
  // Ensure subcategoryId is always string or undefined
  normalized.subcategoryId = typeof transaction.subcategoryId === 'string' 
    ? transaction.subcategoryId 
    : undefined;
    
  // Ensure categoryId is always string or undefined
  normalized.categoryId = typeof transaction.categoryId === 'string' 
    ? transaction.categoryId 
    : undefined;
    
  // Ensure description is always string
  normalized.description = transaction.description || '';
  
  // Ensure amount is always number
  normalized.amount = typeof transaction.amount === 'number' ? transaction.amount : 0;
  
  // Ensure type is valid
  normalized.type = transaction.type === 'income' || transaction.type === 'expense' 
    ? transaction.type 
    : 'expense';

  // Validate and clean subcategoryId if it's an object
  if (typeof transaction.subcategoryId === 'object' && transaction.subcategoryId !== null) {
    console.warn('🔧 [VALIDATION] Found object in subcategoryId, cleaning:', {
      transactionId: transaction.id,
      subcategoryId: transaction.subcategoryId
    });
    normalized.subcategoryId = undefined;
  }

  // Validate and clean categoryId if it's an object
  if (typeof transaction.categoryId === 'object' && transaction.categoryId !== null) {
    console.warn('🔧 [VALIDATION] Found object in categoryId, cleaning:', {
      transactionId: transaction.id,
      categoryId: transaction.categoryId
    });
    normalized.categoryId = undefined;
  }

  return normalized;
};

// Enhanced TransactionRow component with stable keys
const TransactionRow = React.memo(({
  transaction,
  categories,
  subcategories,
  selectedRows,
  loadingCategories,
  loadingSubcategories,
  categoryOptions,
  onUpdateTransaction,
  onToggleSelection,
  needsAttention,
  getFilteredSubcategories,
  formatCurrency,
  formatDate
}: {
  transaction: TransactionRow;
  categories: Category[];
  subcategories: Subcategory[];
  selectedRows: Set<string>;
  loadingCategories: boolean;
  loadingSubcategories: boolean;
  categoryOptions: Array<{value: string; label: string; type: string}>;
  onUpdateTransaction: (id: string, updates: Partial<TransactionRow>) => void;
  onToggleSelection: (id: string) => void;
  needsAttention: (transaction: TransactionRow) => boolean;
  getFilteredSubcategories: (categoryId: string) => Subcategory[];
  getFilteredCategoriesByType: (transactionType: 'income' | 'expense') => Array<{value: string; label: string; type: string}>;
  formatCurrency: (amount: number) => string;
  formatDate: (dateStr: string) => string;
}) => {
  const requiresAttention = needsAttention(transaction);
  
  // Generate stable keys using the utility function
  const categoryKey = generateStableKey(transaction, 'category-');
  const subcategoryKey = generateStableKey(transaction, 'subcategory-');
  
  const handleCategoryChange = useCallback((value: string) => {
    console.log('🔄 [CATEGORY] Category selection changed:', { 
      transactionId: transaction.id, 
      oldValue: transaction.categoryId,
      newValue: value,
      timestamp: Date.now()
    });
    
    onUpdateTransaction(transaction.id, {
      categoryId: value,
      subcategoryId: undefined, // Reset subcategory when category changes
      aiSuggestion: transaction.aiSuggestion ? {
        ...transaction.aiSuggestion,
        isAISuggested: false // Mark as manually modified
      } : undefined
    });
  }, [transaction.id, transaction.categoryId, transaction.aiSuggestion, onUpdateTransaction]);
  
  const handleSubcategoryChange = useCallback((value: string) => {
    console.log('🔄 [SUBCATEGORY] Subcategory selection changed:', { 
      transactionId: transaction.id, 
      oldValue: transaction.subcategoryId,
      newValue: value,
      categoryId: transaction.categoryId,
      timestamp: Date.now()
    });
    
    onUpdateTransaction(transaction.id, {
      subcategoryId: value
    });
  }, [transaction.id, transaction.subcategoryId, transaction.categoryId, onUpdateTransaction]);
  
  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateTransaction(transaction.id, {
      editedDescription: e.target.value
    });
  }, [transaction.id, onUpdateTransaction]);
  
  const handleDescriptionBlur = useCallback(() => {
    onUpdateTransaction(transaction.id, {
      isEditing: false,
      description: transaction.editedDescription || transaction.description
    });
  }, [transaction.id, transaction.editedDescription, transaction.description, onUpdateTransaction]);
  
  const handleDescriptionKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onUpdateTransaction(transaction.id, {
        isEditing: false,
        description: transaction.editedDescription || transaction.description
      });
    }
  }, [transaction.id, transaction.editedDescription, transaction.description, onUpdateTransaction]);
  
  const handleEditToggle = useCallback(() => {
    onUpdateTransaction(transaction.id, {
      isEditing: !transaction.isEditing,
      editedDescription: transaction.description
    });
  }, [transaction.id, transaction.isEditing, transaction.description, onUpdateTransaction]);
  
  const handleRowToggle = useCallback(() => {
    onToggleSelection(transaction.id);
  }, [transaction.id, onToggleSelection]);
  
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
          onCheckedChange={handleRowToggle}
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
            onChange={handleDescriptionChange}
            onBlur={handleDescriptionBlur}
            onKeyDown={handleDescriptionKeyDown}
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
          key={categoryKey}
          value={transaction.categoryId || ''}
          onValueChange={handleCategoryChange}
          options={getFilteredCategoriesByType(transaction.type)}
          placeholder={loadingCategories ? "Carregando..." : "Selecionar categoria"}
          searchPlaceholder="Buscar categoria..."
          emptyText={loadingCategories ? "Carregando..." : "Nenhuma categoria encontrada"}
          width="w-60"
          disabled={loadingCategories}
        />
      </TableCell>
      
      <TableCell>
        <Combobox
          key={subcategoryKey}
          value={transaction.subcategoryId || ''}
          onValueChange={handleSubcategoryChange}
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
          onClick={handleEditToggle}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
});

TransactionRow.displayName = 'TransactionRow';

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

  // Initialize integrity monitoring
  const { setOperation } = useTransactionIntegrity(tableData, true);

  // Load categories and subcategories
  useEffect(() => {
    console.log('🔍 [DEBUG] TransactionImportTable mounted, loading categories and subcategories...');
    loadCategories();
    loadSubcategories();
  }, []);

  // Enhanced initialization with ID validation
  useEffect(() => {
    console.log('🔍 [DEBUG] transactions prop changed:', {
      length: transactions.length,
      firstTransaction: transactions[0],
      transactionsWithAI: transactions.filter((t: any) => t.aiSuggestion).length
    });
    
    if (transactions.length === 0) {
      setTableData([]);
      return;
    }
    
    // Validate and fix duplicate IDs
    const { transactions: fixedTransactions, hadDuplicates, duplicateReport } = validateAndFixDuplicateIds(transactions);
    
    if (hadDuplicates) {
      console.warn('🚨 [IMPORT_TABLE] Fixed duplicate IDs during initialization:', {
        duplicatesFixed: duplicateReport.length,
        duplicateReport
      });
      
      // Notify parent component of ID changes
      onTransactionsUpdate(fixedTransactions);
    }
    
    // Normalize and validate each transaction
    const normalizedTransactions = fixedTransactions.map(normalizeAndValidateTransaction);
    
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
    
    setTableData(sortedData);
  }, [transactions, sortBy, sortOrder, onTransactionsUpdate]);

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

  // Enhanced update function with integrity verification
  const updateTransaction = useCallback((id: string, updates: Partial<TransactionRow>) => {
    console.log('🔄 [UPDATE] updateTransaction called:', { 
      id, 
      updates,
      timestamp: Date.now()
    });
    
    setOperation(`update-${id}`);
    
    setTableData(prev => {
      // Create snapshot for integrity verification
      const beforeSnapshot = prev.map(t => createIsolatedTransaction(t));
      
      // Verify that only one transaction has this ID
      const transactionsWithSameId = prev.filter(t => t.id === id);
      if (transactionsWithSameId.length > 1) {
        console.error('🚨 [UPDATE] Multiple transactions with same ID detected:', {
          id,
          count: transactionsWithSameId.length,
          transactions: transactionsWithSameId.map(t => ({
            id: t.id,
            description: t.description
          }))
        });
      }
      
      // Create completely new array with isolated transactions
      const newData = prev.map(transaction => {
        if (transaction.id === id) {
          // Create isolated copy and apply updates
          const isolatedTransaction = createIsolatedTransaction(transaction);
          
          const updatedTransaction = {
            ...isolatedTransaction,
            ...updates,
            // Ensure IDs are strings or undefined
            categoryId: typeof updates.categoryId === 'string' && updates.categoryId !== '' 
              ? updates.categoryId 
              : (updates.categoryId === '' ? undefined : isolatedTransaction.categoryId),
            subcategoryId: typeof updates.subcategoryId === 'string' && updates.subcategoryId !== '' 
              ? updates.subcategoryId 
              : (updates.subcategoryId === '' ? undefined : isolatedTransaction.subcategoryId)
          };
          
          return normalizeAndValidateTransaction(updatedTransaction);
        }
        
        // Return isolated copy for other transactions
        return createIsolatedTransaction(transaction);
      });
      
      // Verify integrity
      const integrityOk = verifyTransactionIntegrity(
        beforeSnapshot,
        newData,
        id,
        `update-${Object.keys(updates).join(',')}`
      );
      
      if (!integrityOk) {
        console.error('🚨 [UPDATE] Rolling back due to integrity violation');
        return prev; // Rollback on integrity violation
      }
      
      // Update parent component
      onTransactionsUpdate(newData);
      return newData;
    });
  }, [onTransactionsUpdate, setOperation]);

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

  // Opções memoizadas para melhor performance - filtradas por tipo de transação
  const categoryOptions = useMemo(() => {
    const options = categories.map(cat => ({
      value: cat.id,
      label: cat.name,
      type: cat.type
    }));
    console.log('🎯 [CATEGORIES] Category options memoized:', options.length);
    return options;
  }, [categories]);

  // Função para obter categorias filtradas por tipo de transação
  const getFilteredCategoriesByType = useCallback((transactionType: 'income' | 'expense') => {
    return categoryOptions.filter(cat => cat.type === transactionType);
  }, [categoryOptions]);

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
                {getCurrentPageData().map(transaction => (
                  <TransactionRow
                    key={generateStableKey(transaction, 'transaction-')}
                    transaction={transaction}
                    categories={categories}
                    subcategories={subcategories}
                    selectedRows={selectedRows}
                    loadingCategories={loadingCategories}
                    loadingSubcategories={loadingSubcategories}
                    categoryOptions={categoryOptions}
                    onUpdateTransaction={updateTransaction}
                    onToggleSelection={toggleRowSelection}
                    needsAttention={needsAttention}
                    getFilteredSubcategories={getFilteredSubcategories}
                    getFilteredCategoriesByType={getFilteredCategoriesByType}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                  />
                ))}
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
