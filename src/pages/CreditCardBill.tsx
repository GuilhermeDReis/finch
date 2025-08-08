import React, { useState, useEffect } from 'react';
import { getLogger } from '@/utils/logger';

const logger = getLogger('creditCardBill');
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, CreditCard, Plus } from 'lucide-react';
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
      <div className="container mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/credit-cards')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/credit-cards')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          
          <div className="flex items-center gap-3">
            <CreditCardIcon brand={creditCard.brand} className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">{creditCard.description}</h1>
              <p className="text-muted-foreground">{creditCard.banks?.name}</p>
            </div>
          </div>
        </div>

        {/* Add Transaction Button */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Transação
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

      {/* Month Selector */}
      <div className="flex justify-center mb-6">
        <div className="w-64">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
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

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Resumo da Fatura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total de Transações</p>
              <p className="text-2xl font-bold">{transactions.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalAmount)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Transações Informativas</p>
              <p className="text-2xl font-bold text-blue-600">{informativeTransactionsCount}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Fechamento</p>
              <p className="text-2xl font-bold">{creditCard.closing_day}/mês</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lançamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando transações...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma transação encontrada para este período
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Subcategoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getPaginatedTransactions().map((transaction) => (
                    <TableRow key={transaction.id} className={isInformativeTransaction(transaction) ? 'bg-blue-50' : ''}>
                      <TableCell className="font-mono text-sm">{formatDate(transaction.date)}</TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={transaction.description}>
                          {transaction.description}
                        </div>
                        {isInformativeTransaction(transaction) && (
                          <div className="text-xs text-blue-600 italic mt-1">
                            Transação informativa
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isInformativeTransaction(transaction) ? (
                          <span className="text-muted-foreground text-sm italic">N/A</span>
                        ) : transaction.categories ? (
                          <span className="text-sm">{transaction.categories.name}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
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
                      <TableCell className="text-center">
                        {!isInformativeTransaction(transaction) && (
                          <Button variant="ghost" size="sm">
                            Editar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-end items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
