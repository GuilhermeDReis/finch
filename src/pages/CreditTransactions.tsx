import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { supabase } from '@/integrations/supabase/client';

interface CreditTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  original_description?: string;
  external_id?: string;
  type: string;
  created_at: string;
  updated_at: string;
}

interface TransactionFilters {
  year: string;
  month: string;
  description: string;
}

export default function CreditTransactions() {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<TransactionFilters>({
    year: '2025',
    month: 'all',
    description: ''
  });
  const [loading, setLoading] = useState(true);

  const itemsPerPage = 25;

  // Fetch data from Supabase
  useEffect(() => {
    fetchCreditTransactions();
  }, []);

  const fetchCreditTransactions = async () => {
    try {
      setLoading(true);
      
      const { data: creditTransactionsData, error } = await supabase
        .from('transaction_credit')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      if (creditTransactionsData) {
        setTransactions(creditTransactionsData);
      }
      
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao carregar transações de crédito');
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions based on filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      
      // Filter by year
      if (filters.year !== 'all') {
        const transactionYear = transactionDate.getFullYear().toString();
        if (transactionYear !== filters.year) return false;
      }

      // Filter by month
      if (filters.month !== 'all') {
        const transactionMonth = (transactionDate.getMonth() + 1).toString().padStart(2, '0');
        if (transactionMonth !== filters.month) return false;
      }

      // Filter by description
      if (filters.description && !transaction.description.toLowerCase().includes(filters.description.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [transactions, filters]);

  // Calculate total credit for header card
  const totalCredit = useMemo(() => {
    return filteredTransactions.reduce((sum, transaction) => {
      // Para transações de crédito, valores negativos no arquivo indicam pagamentos/reduções
      // Estes devem ser mostrados como negativos e em verde
      // Todos os outros valores devem ser positivos e em vermelho
      return sum + Math.abs(transaction.amount);
    }, 0);
  }, [filteredTransactions]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  // Determina como exibir o valor baseado nas regras especificadas
  const getDisplayAmount = (transaction: CreditTransaction) => {
    // Se o valor original no arquivo era negativo, significa pagamento/redução
    // Deve ser exibido como negativo e em verde
    const isPayment = transaction.amount < 0;
    
    if (isPayment) {
      return {
        value: transaction.amount, // Mantém negativo
        className: 'text-success font-semibold', // Verde
        prefix: '' // Sem prefixo adicional pois já é negativo
      };
    } else {
      return {
        value: Math.abs(transaction.amount), // Garante que seja positivo
        className: 'text-destructive font-semibold', // Vermelho
        prefix: '+'
      };
    }
  };

  const truncateText = (text: string, maxLength: number = 30) => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const handleFilterChange = (filterType: keyof TransactionFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Transações de Crédito</h1>
              <p className="text-muted-foreground">Visualize e gerencie suas transações de cartão de crédito importadas.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Total Credit Card */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Crédito
              </CardTitle>
              <div className="h-4 w-4 text-muted-foreground">💳</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(totalCredit)}</div>
              <p className="text-xs text-muted-foreground">
                {filteredTransactions.length} transação{filteredTransactions.length !== 1 ? 'ões' : ''}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Ano</label>
                <select
                  value={filters.year}
                  onChange={(e) => handleFilterChange('year', e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md"
                >
                  <option value="all">Todos os anos</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Mês</label>
                <select
                  value={filters.month}
                  onChange={(e) => handleFilterChange('month', e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md"
                >
                  <option value="all">Todos os meses</option>
                  <option value="01">Janeiro</option>
                  <option value="02">Fevereiro</option>
                  <option value="03">Março</option>
                  <option value="04">Abril</option>
                  <option value="05">Maio</option>
                  <option value="06">Junho</option>
                  <option value="07">Julho</option>
                  <option value="08">Agosto</option>
                  <option value="09">Setembro</option>
                  <option value="10">Outubro</option>
                  <option value="11">Novembro</option>
                  <option value="12">Dezembro</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição</label>
                <input
                  type="text"
                  value={filters.description}
                  onChange={(e) => handleFilterChange('description', e.target.value)}
                  placeholder="Buscar por descrição..."
                  className="w-full px-3 py-2 border border-input bg-background rounded-md"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando transações de crédito...</p>
            </div>
          </div>
        ) : (
          <Card className="p-6">
            {/* Tabela Desktop */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        Nenhuma transação de crédito encontrada. Tente ajustar os filtros.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTransactions.map((transaction) => {
                      const displayAmount = getDisplayAmount(transaction);
                      return (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">
                            {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs" title={transaction.description}>
                              <span className="block truncate">{transaction.description}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={displayAmount.className}>
                              {displayAmount.prefix}{formatCurrency(Math.abs(displayAmount.value))}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Cards Mobile */}
            <div className="md:hidden space-y-4">
              {paginatedTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma transação de crédito encontrada. Tente ajustar os filtros.
                </div>
              ) : (
                paginatedTransactions.map((transaction) => {
                  const displayAmount = getDisplayAmount(transaction);
                  return (
                    <Card key={transaction.id} className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold">{truncateText(transaction.description, 25)}</h3>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className={displayAmount.className}>
                            {displayAmount.prefix}{formatCurrency(Math.abs(displayAmount.value))}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Exibindo {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredTransactions.length)} de {filteredTransactions.length} transações
                </p>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  
                  <span className="text-sm">
                    Página {currentPage} de {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
