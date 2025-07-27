import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction } from '@/types/transaction';

interface TransactionSummaryCardsProps {
  transactions: Transaction[];
  filteredTransactions?: Transaction[];
}

export function TransactionSummaryCards({ transactions, filteredTransactions }: TransactionSummaryCardsProps) {
  // Use filtered transactions if provided, otherwise use all transactions
  const dataToUse = filteredTransactions || transactions;
  
  const incomeTransactions = dataToUse.filter(t => t.type === 'income');
  const expenseTransactions = dataToUse.filter(t => t.type === 'expense');
  
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const periodText = filteredTransactions ? "(Período Filtrado)" : "";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total de Receitas {periodText}
          </CardTitle>
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
          <CardTitle className="text-sm font-medium">
            Total de Despesas {periodText}
          </CardTitle>
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
          <CardTitle className="text-sm font-medium">
            Saldo {periodText}
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(balance)}
          </div>
          <p className="text-xs text-muted-foreground">
            Diferença entre receitas e despesas
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
