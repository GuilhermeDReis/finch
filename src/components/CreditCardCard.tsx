import { useState, useEffect } from 'react';
import { Edit, Archive, MoreVertical, Calendar, CreditCard } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { CreditCardWithBank, CreditCardBill } from '@/types/creditCard';
import { CreditCardIcon, getBrandDisplayName } from '@/components/ui/credit-card-icons';
import { CreditCardBillService } from '@/services/creditCardBillService';
import { useAuth } from '@/contexts/AuthContext';

interface CreditCardCardProps {
  creditCard: CreditCardWithBank;
  onEdit: () => void;
  onArchive: () => void;
}

export function CreditCardCard({ creditCard, onEdit, onArchive }: CreditCardCardProps) {
  const { user } = useAuth();
  const [bill, setBill] = useState<CreditCardBill | null>(null);
  const [loading, setLoading] = useState(true);

  // Calculate bill information
  useEffect(() => {
    const calculateBill = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const billData = await CreditCardBillService.calculateCurrentBill(creditCard.id, user.id);
        setBill(billData);
      } catch (error) {
        console.error('Error calculating bill:', error);
      } finally {
        setLoading(false);
      }
    };

    calculateBill();
  }, [creditCard.id, user]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const getDaysUntilDue = () => {
    if (!bill) return 0;
    return CreditCardBillService.getDaysUntilDue(bill.due_date);
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200">
      {/* Card Header with Bank and Brand Info */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <CreditCardIcon brand={creditCard.brand} className="h-8 w-8" />
            <div>
              <h3 className="font-semibold text-lg leading-tight">{creditCard.description}</h3>
              <p className="text-sm text-muted-foreground">{creditCard.banks.name}</p>
            </div>
          </div>
          
          {/* Menu dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Archive className="h-4 w-4 mr-2" />
                    Arquivar
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Arquivar cartão?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O cartão "{creditCard.description}" será arquivado mas permanecerá no histórico 
                      e seus valores em aberto continuarão sendo contabilizados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onArchive}>
                      Arquivar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Brand Badge */}
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            {getBrandDisplayName(creditCard.brand)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-6 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          </div>
        ) : bill ? (
          <>
            {/* Limit and Usage */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Fatura Atual</span>
                <span className="text-sm text-muted-foreground">
                  {bill.usage_percentage.toFixed(1)}% usado
                </span>
              </div>
              
              <Progress 
                value={bill.usage_percentage} 
                className="h-2"
              />
              
              <div className="flex justify-between items-center text-sm">
                <span className={CreditCardBillService.getUsageStatusColor(bill.usage_percentage)}>
                  {CreditCardBillService.formatCurrency(bill.current_amount)}
                </span>
                <span className="text-muted-foreground">
                  de {CreditCardBillService.formatCurrency(bill.limit_amount)}
                </span>
              </div>
            </div>

            {/* Available Limit */}
            <div className="flex justify-between items-center py-2 border-t">
              <span className="text-sm text-muted-foreground">Limite Disponível</span>
              <span className="text-sm font-medium text-green-600">
                {CreditCardBillService.formatCurrency(bill.available_limit)}
              </span>
            </div>

            {/* Billing Information */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Fechamento</span>
                </div>
                <span>{creditCard.closing_day}/mês</span>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  <span>Vencimento</span>
                </div>
                <span>
                  {creditCard.due_day}/mês
                  {getDaysUntilDue() > 0 && getDaysUntilDue() <= 7 && (
                    <Badge variant="destructive" className="ml-2 text-xs py-0 px-1">
                      {getDaysUntilDue()}d
                    </Badge>
                  )}
                </span>
              </div>

              {bill.transactions_count > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Transações no período</span>
                  <span>{bill.transactions_count}</span>
                </div>
              )}
            </div>

            {/* Status Badge */}
            <div className="flex justify-center pt-2">
              <Badge 
                variant={bill.usage_percentage >= 90 ? "destructive" : 
                        bill.usage_percentage >= 70 ? "default" : "secondary"}
                className="text-xs"
              >
                {CreditCardBillService.getUsageStatusText(bill.usage_percentage)}
              </Badge>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Erro ao carregar informações da fatura
            </p>
          </div>
        )}
      </CardContent>

      {/* Card Gradient Overlay */}
      <div 
        className={`absolute inset-x-0 bottom-0 h-1 ${
          bill ? getProgressBarColor(bill.usage_percentage) : 'bg-gray-300'
        }`}
      />
    </Card>
  );
}
