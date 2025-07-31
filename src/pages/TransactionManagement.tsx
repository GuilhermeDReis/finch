import { useState, useEffect, useMemo } from 'react';
import { PlusCircle, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { TransactionSummaryCards } from '@/components/TransactionSummaryCards';
import { TransactionFiltersNew } from '@/components/TransactionFiltersNew';
import { TransactionTable } from '@/components/TransactionTable';
import { TransactionModal } from '@/components/TransactionModal';

import { Transaction, TransactionFormData } from '@/types/transaction';
import { supabase } from '@/integrations/supabase/client';

interface TransactionFilters {
  year: string;
  month: string;
  category: string;
  subcategory: string;
  description: string;
}

export default function TransactionManagement() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<TransactionFilters>({
    year: '2025',
    month: 'all',
    category: 'all',
    subcategory: 'all',
    description: ''
  });
  const [loading, setLoading] = useState(true);

  const itemsPerPage = 25;

  // Fetch data from Supabase
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*');

      if (categoriesError) throw categoriesError;

      // Fetch subcategories
      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from('subcategories')
        .select('*');

      if (subcategoriesError) throw subcategoriesError;

      if (transactionsData) {
        const formattedTransactions: Transaction[] = transactionsData.map(t => ({
          id: t.id,
          type: t.type as 'income' | 'expense',
          amount: t.amount,
          description: t.description,
          category_id: t.category_id,
          subcategory: t.subcategory_id || undefined,
          date: new Date(t.date),
          payment_method: t.payment_method as any,
          tags: t.tags || [],
          notes: t.notes || undefined,
          is_recurring: t.is_recurring || false,
          recurring_frequency: t.recurring_frequency as any,
          created_at: new Date(t.created_at),
          updated_at: new Date(t.updated_at)
        }));
        setTransactions(formattedTransactions);
      }

      setCategories(categoriesData || []);
      setSubcategories(subcategoriesData || []);
      
    } catch (error) {
      // console.error('Error:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions based on filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      // Filter by year
      if (filters.year !== 'all') {
        const transactionYear = transaction.date.getFullYear().toString();
        if (transactionYear !== filters.year) return false;
      }

      // Filter by month
      if (filters.month !== 'all') {
        const transactionMonth = (transaction.date.getMonth() + 1).toString().padStart(2, '0');
        if (transactionMonth !== filters.month) return false;
      }

      // Filter by category
      if (filters.category !== 'all' && transaction.category_id !== filters.category) {
        return false;
      }

      // Filter by subcategory
      if (filters.subcategory !== 'all' && transaction.subcategory !== filters.subcategory) {
        return false;
      }

      // Filter by description
      if (filters.description && !transaction.description.toLowerCase().includes(filters.description.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [transactions, filters]);

  // Reset to first page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleSubmitTransaction = async (data: TransactionFormData) => {
    try {
      const amount = Number(data.amount.replace(/[^\d,]/g, '').replace(',', '.'));
      
      if (editingTransaction) {
        // Edit existing transaction
        const { data: updatedData, error } = await supabase
          .from('transactions')
          .update({
            type: data.type,
            amount: amount,
            description: data.description,
            category_id: data.category_id,
            subcategory_id: data.subcategory || null,
            date: data.date.toISOString(),
            payment_method: data.payment_method,
            tags: data.tags,
            notes: data.notes,
            is_recurring: data.is_recurring,
            recurring_frequency: data.recurring_frequency,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTransaction.id)
          .select()
          .single();

        if (error) throw error;

        const updatedTransaction: Transaction = {
          ...editingTransaction,
          ...data,
          amount: amount,
          subcategory: data.subcategory || undefined,
          updated_at: new Date()
        };

        setTransactions(prev => 
          prev.map(t => t.id === editingTransaction.id ? updatedTransaction : t)
        );
        
        toast.success('Transação atualizada com sucesso!', {
          description: `${data.description} foi atualizada.`,
        });
      } else {
        // Create new transaction
        const { data: newData, error } = await supabase
          .from('transactions')
          .insert({
            type: data.type,
            amount: amount,
            description: data.description,
            category_id: data.category_id,
            subcategory_id: data.subcategory || null,
            date: data.date.toISOString(),
            payment_method: data.payment_method,
            tags: data.tags,
            notes: data.notes,
            is_recurring: data.is_recurring,
            recurring_frequency: data.recurring_frequency,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        const newTransaction: Transaction = {
          id: newData.id,
          ...data,
          amount: amount,
          subcategory: data.subcategory || undefined,
          created_at: new Date(),
          updated_at: new Date()
        };

        setTransactions(prev => [newTransaction, ...prev]);
        
        toast.success(
          `${data.type === 'income' ? 'Receita' : 'Despesa'} cadastrada com sucesso!`,
          {
            description: `${data.description} - ${new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(newTransaction.amount)}`,
          }
        );
      }

      setEditingTransaction(null);
      setIsModalOpen(false);
      await fetchAllData(); // Refresh data
    } catch (error) {
      // console.error('Error saving transaction:', error);
      toast.error('Erro ao salvar transação');
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTransactions(prev => prev.filter(t => t.id !== id));
      toast.success('Transação excluída com sucesso!');
    } catch (error) {
      // console.error('Error deleting transaction:', error);
      toast.error('Erro ao excluir transação');
    }
  };

  const handleOpenModal = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Transações</h1>
              <p className="text-muted-foreground">Visualize e gerencie todas as suas receitas e despesas.</p>
            </div>
            
            <Button 
              onClick={handleOpenModal}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Adicionar Transação
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <TransactionSummaryCards 
          transactions={transactions} 
          filteredTransactions={filteredTransactions}
        />

        {/* Filters */}
        <TransactionFiltersNew
          transactions={transactions}
          categories={categories}
          subcategories={subcategories}
          filters={filters}
          onFiltersChange={setFilters}
        />

        {/* Transactions Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando transações...</p>
            </div>
          </div>
        ) : (
          <TransactionTable
            transactions={filteredTransactions}
            categories={categories}
            subcategories={subcategories}
            onEdit={handleEditTransaction}
            onDelete={handleDeleteTransaction}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
          />
        )}

        {/* Transaction Modal */}
        <TransactionModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSubmit={handleSubmitTransaction}
          editTransaction={editingTransaction}
        />
      </div>
    </div>
  );
}
