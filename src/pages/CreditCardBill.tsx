import React, { useState, useEffect } from 'react';
import { getLogger } from '@/utils/logger';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, CreditCard, Plus, Receipt, TrendingUp, FileText, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCardWithBank } from '@/types/creditCard';
import { CreditCardIcon, getBrandDisplayName } from '@/components/ui/credit-card-icons';
import { CreditCardBillService } from '@/services/creditCardBillService';

const logger = getLogger('creditCardBill');

interface CreditTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category_id: string | null;
  subcategory_id: string | null;
  categories?: {
    id: string;
    name: string;
  };
  subcategories?: {
    id: string;
    name: string;
  };
}

export default function CreditCardBill() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [creditCard, setCreditCard] = useState<CreditCardWithBank | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    date: '',
    description: '',
    amount: '',
    category_id: '',
    subcategory_id: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const itemsPerPage = 20;

  // Generate month options (current month and previous 11 months)
  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = new Intl.DateTimeFormat('pt-BR', { 
        month: 'long', 
        year: 'numeric' 
      }).format(date);
      
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    
    return options;
  };

  const monthOptions = generateMonthOptions();

  // Set default selected month to current month
  useEffect(() => {
    if (!selectedMonth && monthOptions.length > 0) {
      setSelectedMonth(monthOptions[0].value);
    }
  }, [monthOptions, selectedMonth]);

  // Load credit card details
  useEffect(() => {
    const loadCreditCard = async () => {
      if (!cardId || !user) return;

      try {
        const { data, error } = await supabase
          .from('credit_cards')
          .select(`
            *,
            banks (
              id,
              name
            )
          `)
          .eq('id', cardId)
          .eq('user_id', user.id)
          .single();

        if (error) {
          logger.error('Error loading credit card', { cardId, error: error.message });
          return;
        }

        setCreditCard(data);
      } catch (error) {
        logger.error('Error loading credit card', { cardId, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    };

    loadCreditCard();
  }, [cardId, user]);

  // Load transactions function
  const loadTransactions = async () => {
    if (!cardId || !user || !selectedMonth || !creditCard) return;

    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      
      // Calculate billing period for the selected month
      const billingStartDate = new Date(year, month - 1, creditCard.closing_day + 1);
      const billingEndDate = new Date(year, month, creditCard.closing_day);

      // If we're looking at a future month, adjust the dates
      if (billingStartDate > new Date()) {
        billingStartDate.setMonth(billingStartDate.getMonth() - 1);
        billingEndDate.setMonth(billingEndDate.getMonth() - 1);
      }

      const { data, error } = await supabase
        .from('transaction_credit')
        .select(`
          id,
          date,
          description,
          amount,
          category_id,
          subcategory_id,
          categories (
            id,
            name
          ),
          subcategories (
            id,
            name
          )
        `)
        .eq('credit_card_id', cardId)
        .eq('user_id', user.id)
        .gte('date', billingStartDate.toISOString().split('T')[0])
        .lte('date', billingEndDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) {
        logger.error('Error loading transactions', { cardId, error: error.message });
        return;
      }

      setTransactions(data || []);
      setTotalPages(Math.ceil((data?.length || 0) / itemsPerPage));
      setCurrentPage(1);
    } catch (error) {
      logger.error('Error loading transactions', { cardId, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  // Load transactions for selected month
  useEffect(() => {
    loadTransactions();
  }, [cardId, user, selectedMonth, creditCard]);

  // Load categories and subcategories for the form
  useEffect(() => {
    if (isModalOpen) {
      loadCategoriesAndSubcategories();
      // Set default date to current date
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, date: today }));
    }
  }, [isModalOpen]);

  const loadCategoriesAndSubcategories = async () => {
    setLoadingCategories(true);
    try {
      const [categoriesResponse, subcategoriesResponse] = await Promise.all([
        supabase.from('categories').select('*').eq('type', 'expense').order('name'),
        supabase.from('subcategories').select('*').order('name')
      ]);

      if (categoriesResponse.data) setCategories(categoriesResponse.data);
      if (subcategoriesResponse.data) setSubcategories(subcategoriesResponse.data);
    } catch (error) {
      logger.error('Error loading categories', { error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Reset subcategory when category changes
      ...(field === 'category_id' ? { subcategory_id: '' } : {})
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !cardId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('transaction_credit')
        .insert({
          user_id: user.id,
          credit_card_id: cardId,
          date: formData.date,
          description: formData.description,
          amount: parseFloat(formData.amount),
          category_id: formData.category_id || null,
          subcategory_id: formData.subcategory_id || null
        });

      if (error) {
        logger.error('Error creating transaction', { cardId, error: error.message });
        return;
      }

      // Reset form and close modal
      setFormData({
        date: '',
        description: '',
        amount: '',
        category_id: '',
        subcategory_id: ''
      });
      setIsModalOpen(false);
      
      // Reload transactions
      loadTransactions();
    } catch (error) {
      logger.error('Error submitting transaction', { cardId, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFilteredSubcategories = () => {
    return subcategories.filter(sub => sub.category_id === formData.category_id);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(dateString));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Helper function to check if transaction is informative
  const isInformativeTransaction = (transaction: CreditTransaction) => {
    // Valores negativos (pagamentos da fatura)
    if (transaction.amount < 0) return true;
    
    // Verificar descrições específicas que tornam a transação informativa
    const descriptionLower = transaction.description.toLowerCase();
    const informativeDescriptions = [
      'pagamento recebido',
      'juros de dívida encerrada', 
      'saldo em atraso',
      'crédito de atraso',
      'encerramento de dívida'
    ];
    
    const isInformativeDescription = informativeDescriptions.some(desc => 
      descriptionLower.includes(desc)
    );
    
    return isInformativeDescription;
  };

  const getPaginatedTransactions = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return transactions.slice(startIndex, endIndex);
  };

  // Calculate totals excluding informative transactions
  const totalAmount = transactions
    .filter(t => !isInformativeTransaction(t) && t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const informativeTransactionsCount = transactions
    .filter(t => isInformativeTransaction(t))
    .length;

  if (!creditCard) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/credit-cards')}
              className="hover:bg-white hover:shadow-sm transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600">Carregando cartão...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/credit-cards')}
                className="hover:bg-white hover:shadow-sm transition-all duration-200 p-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                  <CreditCardIcon brand={creditCard.brand} className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-light text-gray-900">{creditCard.description}</h1>
                  <p className="text-gray-600 mt-1">{creditCard.banks?.name} • Final {creditCard.last_four_digits}</p>
                </div>
              </div>
            </div>

            {/* Add Transaction Button */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-sm px-6 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-md">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Transação
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Nova Transação</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleFormChange('date', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleFormChange('description', e.target.value)}
                      placeholder="Descrição da transação"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => handleFormChange('amount', e.target.value)}
                      placeholder="0,00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => handleFormChange('category_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subcategory">Subcategoria</Label>
                    <Select
                      value={formData.subcategory_id}
                      onValueChange={(value) => handleFormChange('subcategory_id', value)}
                      disabled={!formData.category_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma subcategoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilteredSubcategories().map((subcategory) => (
                          <SelectItem key={subcategory.id} value={subcategory.id}>
                            {subcategory.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsModalOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Month Selector & Stats Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Month Selector */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Calendar className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium text-gray-900">Período</h3>
              </div>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Transações</p>
                  <p className="text-2xl font-light text-gray-900 mt-1">{transactions.length}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Receipt className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Valor Total</p>
                  <p className="text-2xl font-light text-gray-900 mt-1">{formatCurrency(totalAmount)}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Fechamento</p>
                  <p className="text-2xl font-light text-gray-900 mt-1">Dia {creditCard.closing_day}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Receipt className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-medium text-gray-900">Transações</h2>
              </div>
              <div className="text-sm text-gray-500">
                {transactions.length} {transactions.length === 1 ? 'transação' : 'transações'}
              </div>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
                <p className="text-gray-600 text-lg mb-2">Carregando transações...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Receipt className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-600 text-lg mb-2">Nenhuma transação encontrada</p>
                <p className="text-gray-500 text-sm">Adicione uma nova transação para começar</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-100">
                        <TableHead className="font-medium text-gray-700">Data</TableHead>
                        <TableHead className="font-medium text-gray-700">Descrição</TableHead>
                        <TableHead className="font-medium text-gray-700">Categoria</TableHead>
                        <TableHead className="font-medium text-gray-700">Subcategoria</TableHead>
                        <TableHead className="text-right font-medium text-gray-700">Valor</TableHead>
                        <TableHead className="w-[100px] font-medium text-gray-700">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getPaginatedTransactions().map((transaction) => (
                        <TableRow 
                          key={transaction.id} 
                          className={`border-gray-100 hover:bg-gray-50 transition-colors duration-150 ${
                            isInformativeTransaction(transaction) ? 'bg-blue-50 hover:bg-blue-100' : ''
                          }`}
                        >
                          <TableCell className="font-medium text-gray-900">
                            {formatDate(transaction.date)}
                          </TableCell>
                          <TableCell className="max-w-xs text-gray-900">
                            <div className="truncate" title={transaction.description}>
                              {transaction.description}
                            </div>
                            {isInformativeTransaction(transaction) && (
                              <div className="text-xs text-blue-600 italic mt-1">
                                Transação informativa
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {isInformativeTransaction(transaction) ? (
                              <span className="text-muted-foreground text-sm italic">N/A</span>
                            ) : transaction.categories ? (
                              <span className="text-sm">{transaction.categories.name}</span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {isInformativeTransaction(transaction) ? (
                              <span className="text-muted-foreground text-sm italic">N/A</span>
                            ) : transaction.subcategories ? (
                              <span className="text-sm text-muted-foreground">{transaction.subcategories.name}</span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-medium ${
                              isInformativeTransaction(transaction) ? 'text-blue-600' :
                              transaction.amount > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {formatCurrency(transaction.amount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {!isInformativeTransaction(transaction) && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                              >
                                Editar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
                    <p className="text-sm text-gray-600">
                      Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, transactions.length)} de {transactions.length} transações
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="border-gray-200 hover:bg-gray-50"
                      >
                        Anterior
                      </Button>
                      <span className="text-sm text-gray-600 px-3">
                        Página {currentPage} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="border-gray-200 hover:bg-gray-50"
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
