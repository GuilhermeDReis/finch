import React, { useState, useEffect } from 'react';
import { Receipt, Search, RefreshCw, AlertTriangle, Info, Eye, Calendar, Filter } from 'lucide-react';
import { useBelvoConfig } from '@/contexts/BelvoConfigContext';
import { useBelvoApi, useBelvoValidation } from '@/hooks/useBelvoApi';
import { TransactionsParams, BelvoTransaction } from '@/types/belvo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { JsonViewer } from './JsonViewer';

export function GetTransactionsTab() {
  const { currentLinkId } = useBelvoConfig();
  const { getTransactionsDirect, isLoading, error, clearError } = useBelvoApi();
  const { validateTransactionsParams } = useBelvoValidation();

  const [params, setParams] = useState<TransactionsParams>({
    link: currentLinkId,
    page: 1,
    page_size: 20
  });

  const [apiResponse, setApiResponse] = useState<any>(null);
  const [transactions, setTransactions] = useState<BelvoTransaction[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showJsonView, setShowJsonView] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Atualizar link ID quando disponível
  useEffect(() => {
    if (currentLinkId && currentLinkId !== params.link) {
      setParams(prev => ({ ...prev, link: currentLinkId }));
    }
  }, [currentLinkId, params.link]);

  const handleInputChange = (field: keyof TransactionsParams, value: string | number) => {
    setParams(prev => ({ ...prev, [field]: value }));
    
    // Limpar erros quando o usuário começar a digitar
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
    if (error) {
      clearError();
    }
  };

  const handleDateChange = (field: 'date_from' | 'date_to', value: string) => {
    if (value) {
      setParams(prev => ({ ...prev, [field]: value }));
    } else {
      setParams(prev => {
        const newParams = { ...prev };
        delete newParams[field];
        return newParams;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar parâmetros
    const errors = validateTransactionsParams(params);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Limpar estados anteriores
    setValidationErrors([]);
    setApiResponse(null);
    setTransactions([]);
    clearError();

    try {
      // Usar a nova API direta
      const result = await getTransactionsDirect(
        params.link,
        params.page,
        params.page_size,
        params.date_from,
        params.date_to,
        params.account,
        params.amount_gte,
        params.amount_lte
      );
      
      // Definir resposta da API
      setApiResponse(result);
      
      // Extrair transações do resultado
      if (result && result.results) {
        setTransactions(Array.isArray(result.results) ? result.results : [result.results]);
      } else if (result && Array.isArray(result)) {
        setTransactions(result);
      }
    } catch (err) {
      console.error('Erro ao obter transações:', err);
      // O erro já foi definido pelo hook useBelvoApi
    }
  };

  const formatCurrency = (amount: number, currency: string = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'INFLOW': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'OUTFLOW': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'PROCESSED': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'PENDING': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'UNCATEGORIZED': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const clearFilters = () => {
    setParams({
      link: currentLinkId,
      page: 1,
      page_size: 20
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Obter Transações
          </CardTitle>
          <CardDescription>
            Liste todas as transações das contas associadas ao link. 
            Use filtros para refinar sua busca por período, conta específica ou valor.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Parâmetros de Busca</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Link ID */}
            <div className="space-y-2">
              <Label htmlFor="link">Link ID *</Label>
              <Input
                id="link"
                type="text"
                value={params.link}
                onChange={(e) => handleInputChange('link', e.target.value)}
                placeholder="ID do link criado anteriormente"
                className={!currentLinkId ? 'border-amber-500' : ''}
              />
              {!currentLinkId && (
                <p className="text-sm text-amber-600">
                  Nenhum link ativo. Crie um link primeiro na aba "Criar Link".
                </p>
              )}
            </div>

            {/* Paginação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="page">Página</Label>
                <Input
                  id="page"
                  type="number"
                  min="1"
                  value={params.page}
                  onChange={(e) => handleInputChange('page', parseInt(e.target.value) || 1)}
                  placeholder="1"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="page_size">Itens por Página</Label>
                <Input
                  id="page_size"
                  type="number"
                  min="1"
                  max="1000"
                  value={params.page_size}
                  onChange={(e) => handleInputChange('page_size', parseInt(e.target.value) || 20)}
                  placeholder="20"
                />
              </div>
            </div>

            {/* Filtros Avançados */}
            <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" type="button" className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  {showAdvancedFilters ? 'Ocultar' : 'Mostrar'} Filtros Avançados
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-4 mt-4">
                {/* Filtros de Data */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date_from" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Data Inicial
                    </Label>
                    <Input
                      id="date_from"
                      type="date"
                      value={params.date_from || ''}
                      onChange={(e) => handleDateChange('date_from', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date_to" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Data Final
                    </Label>
                    <Input
                      id="date_to"
                      type="date"
                      value={params.date_to || ''}
                      onChange={(e) => handleDateChange('date_to', e.target.value)}
                    />
                  </div>
                </div>

                {/* Filtros de Valor */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount_gte">Valor Mínimo</Label>
                    <Input
                      id="amount_gte"
                      type="number"
                      step="0.01"
                      value={params.amount_gte || ''}
                      onChange={(e) => handleInputChange('amount_gte', parseFloat(e.target.value) || undefined as any)}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="amount_lte">Valor Máximo</Label>
                    <Input
                      id="amount_lte"
                      type="number"
                      step="0.01"
                      value={params.amount_lte || ''}
                      onChange={(e) => handleInputChange('amount_lte', parseFloat(e.target.value) || undefined as any)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Conta Específica */}
                <div className="space-y-2">
                  <Label htmlFor="account">ID da Conta (opcional)</Label>
                  <Input
                    id="account"
                    type="text"
                    value={params.account || ''}
                    onChange={(e) => handleInputChange('account', e.target.value || undefined as any)}
                    placeholder="ID específico da conta para filtrar"
                  />
                  <p className="text-sm text-muted-foreground">
                    Use o ID de uma conta específica obtida na aba "Obter Contas"
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </CollapsibleContent>
            </Collapsible>

            {/* Erros de Validação */}
            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Erro da API */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isLoading || !params.link}
                className="flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                {isLoading ? 'Carregando...' : 'Buscar Transações'}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSubmit(new Event('submit') as any)}
                disabled={isLoading || !params.link}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Resultados */}
      {apiResponse && (
        <div className="space-y-4">
          {/* Resumo dos Resultados */}
          {transactions.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">
                      {transactions.length} transação(ões) encontrada(s)
                    </h3>
                    {apiResponse.meta && (
                      <p className="text-sm text-muted-foreground">
                        Total: {apiResponse.meta.count} • 
                        Página {params.page} de {Math.ceil(apiResponse.meta.count / (params.page_size || 20))}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowJsonView(!showJsonView)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {showJsonView ? 'Ver Tabela' : 'Ver JSON'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Visualização em Tabela */}
          {!showJsonView && transactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transações Encontradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Conta</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Coletado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">
                            {formatDate(transaction.value_date)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {transaction.description}
                          </TableCell>
                          <TableCell>
                            <Badge className={getTransactionTypeColor(transaction.type)}>
                              {transaction.type}
                            </Badge>
                          </TableCell>
                          <TableCell className={`font-medium ${
                            transaction.type === 'INFLOW' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(transaction.status)}>
                              {transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {transaction.account.name}
                          </TableCell>
                          <TableCell>
                            {transaction.category || 'N/A'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateTime(transaction.collected_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Visualização JSON */}
          {(showJsonView || transactions.length === 0) && (
            <JsonViewer
              data={apiResponse.success ? apiResponse.data : apiResponse}
              title="Resposta da API"
              showMetadata={!!apiResponse.meta}
              metadata={apiResponse.meta}
            />
          )}

          {/* Paginação */}
          {apiResponse.meta && (apiResponse.meta.next || apiResponse.meta.previous) && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    disabled={!apiResponse.meta.previous || isLoading}
                    onClick={() => {
                      if (params.page > 1) {
                        handleInputChange('page', params.page - 1);
                        handleSubmit(new Event('submit') as any);
                      }
                    }}
                  >
                    Página Anterior
                  </Button>
                  
                  <span className="text-sm text-muted-foreground">
                    Página {params.page}
                  </span>
                  
                  <Button
                    variant="outline"
                    disabled={!apiResponse.meta.next || isLoading}
                    onClick={() => {
                      handleInputChange('page', params.page + 1);
                      handleSubmit(new Event('submit') as any);
                    }}
                  >
                    Próxima Página
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Informações Adicionais */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Dica:</strong> Use os filtros avançados para refinar sua busca. 
          Você pode filtrar por período específico, valor mínimo/máximo ou conta específica. 
          As transações são ordenadas por data mais recente primeiro.
        </AlertDescription>
      </Alert>
    </div>
  );
}