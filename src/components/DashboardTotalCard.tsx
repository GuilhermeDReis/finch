import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, CreditCard } from 'lucide-react';

interface DashboardTotalCardProps {
  title: string;
  value: number;
  type: 'income' | 'expense' | 'balance' | 'credit';
  loading?: boolean;
}

const DashboardTotalCard = React.memo(function DashboardTotalCard({ title, value, type, loading }: DashboardTotalCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const getIcon = () => {
    switch (type) {
      case 'income':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'expense':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'balance':
        return <DollarSign className="h-4 w-4 text-primary" />;
      case 'credit':
        return <CreditCard className="h-4 w-4 text-orange-600" />;
    }
  };

  const getValueColor = () => {
    switch (type) {
      case 'income':
        return 'text-green-600';
      case 'expense':
        return 'text-red-600';
      case 'balance':
        return value >= 0 ? 'text-green-600' : 'text-red-600';
      case 'credit':
        return 'text-orange-600';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-24" />
          </CardTitle>
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {getIcon()}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${getValueColor()}`}>
          {formatCurrency(value)}
        </div>
      </CardContent>
    </Card>
  );
});

export default DashboardTotalCard;