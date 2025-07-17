import { useState } from 'react';
import { PlusCircle, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

import { TransactionForm } from '@/components/TransactionForm';
import { TransactionTable } from '@/components/TransactionTable';

import { Transaction, TransactionFormData, TransactionType } from '@/types/transaction';
import { mockTransactions } from '@/data/mockData';

export default function TransactionManagement() {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [activeTab, setActiveTab] = useState<TransactionType>('income');

  const handleSubmitTransaction = (data: TransactionFormData) => {
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      ...data,
      amount: Number(data.amount.replace(/[^\d,]/g, '').replace(',', '.')),
      created_at: new Date(),
      updated_at: new Date(),
    };

    setTransactions(prev => [newTransaction, ...prev]);
    
    toast.success(
      `${data.type === 'income' ? 'Receita' : 'Gasto'} cadastrado com sucesso!`,
      {
        description: `${data.description} - ${new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(newTransaction.amount)}`,
      }
    );
  };

  const handleEditTransaction = (transaction: Transaction) => {
    toast.info('Função de edição em desenvolvimento', {
      description: 'Esta funcionalidade será implementada em breve.',
    });
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    toast.success('Transação excluída com sucesso!');
  };

  // Cálculos para estatísticas
  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Gestão Financeira</h1>
              <p className="text-muted-foreground">Cadastro e controle de transações</p>
            </div>
            
            {/* Breadcrumb */}
            <div className="flex items-center text-sm text-muted-foreground">
              <span>Início</span>
              <span className="mx-2">/</span>
              <span className="text-foreground">Transações</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Receitas</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{formatCurrency(totalIncome)}</div>
              <p className="text-xs text-muted-foreground">
                {incomeTransactions.length} transação{incomeTransactions.length !== 1 ? 'ões' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Gastos</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpense)}</div>
              <p className="text-xs text-muted-foreground">
                {expenseTransactions.length} transação{expenseTransactions.length !== 1 ? 'ões' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(balance)}
              </div>
              <p className="text-xs text-muted-foreground">
                Diferença entre receitas e gastos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs de Receitas e Gastos */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TransactionType)}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <TabsList className="grid w-full sm:w-auto grid-cols-2">
              <TabsTrigger value="income" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Receitas
                <Badge variant="income" className="ml-1">
                  {incomeTransactions.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="expense" className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Gastos
                <Badge variant="expense" className="ml-1">
                  {expenseTransactions.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="income" className="space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <PlusCircle className="h-5 w-5 text-success" />
                <h2 className="text-xl font-semibold">Cadastrar Nova Receita</h2>
              </div>
              <TransactionForm type="income" onSubmit={handleSubmitTransaction} />
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Receitas Recentes</h2>
              <TransactionTable
                transactions={transactions}
                type="income"
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
              />
            </div>
          </TabsContent>

          <TabsContent value="expense" className="space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <PlusCircle className="h-5 w-5 text-destructive" />
                <h2 className="text-xl font-semibold">Cadastrar Novo Gasto</h2>
              </div>
              <TransactionForm type="expense" onSubmit={handleSubmitTransaction} />
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Gastos Recentes</h2>
              <TransactionTable
                transactions={transactions}
                type="expense"
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}