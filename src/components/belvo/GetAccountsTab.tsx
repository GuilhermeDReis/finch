import React, { useState, useEffect } from 'react';
import { CreditCard, Search, RefreshCw, AlertTriangle, Info, Eye } from 'lucide-react';
import { useBelvoConfig } from '@/contexts/BelvoConfigContext';
import { useBelvoApi, useBelvoValidation } from '@/hooks/useBelvoApi';
import { AccountsParams, BelvoAccount } from '@/types/belvo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { JsonViewer } from './JsonViewer';

export function GetAccountsTab() {
  const { currentLinkId } = useBelvoConfig();
  const { getAccountsDirect, isLoading, error, clearError } = useBelvoApi();
  const { validateAccountsParams } = useBelvoValidation();

  const [params, setParams] = useState<AccountsParams>({
    link: currentLinkId,
    page: 1,
    page_size: 20
  });

  const [apiResponse, setApiResponse] = useState<any>(null);
  const [accounts, setAccounts] = useState<BelvoAccount[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showJsonView, setShowJsonView] = useState(false);

  // Atualizar link ID quando disponível
  useEffect(() => {
    if (currentLinkId && currentLinkId !== params.link) {
      setParams(prev => ({ ...prev, link: currentLinkId }));
    }
  }, [currentLinkId, params.link]);

  const handleInputChange = (field: keyof AccountsParams, value: string | number) => {
    setParams(prev => ({ ...prev, [field]: value }));
    
    // Limpar erros quando o usuário começar a digitar
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar parâmetros
    const errors = validateAccountsParams(params);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Limpar estados anteriores
    setValidationErrors([]);
    setApiResponse(null);
    setAccounts([]);
    clearError();

    try {
      // Usar a nova API direta
      const result = await getAccountsDirect(
        params.link,
        params.page,
        params.page_size
      );
      
      // Definir resposta da API
      setApiResponse(result);
      
      // Extrair contas do resultado
      if (result && result.results) {
        setAccounts(Array.isArray(result.results) ? result.results : [result.results]);
      } else if (result && Array.isArray(result)) {
        setAccounts(result);
      }
    } catch (err) {
      console.error('Erro ao obter contas:', err);
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAccountTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'checking': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'savings': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'credit': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'loan': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Obter Contas
          </CardTitle>
          <CardDescription>
            Liste todas as contas associadas ao link criado. 
            As contas podem incluir contas correntes, poupança, cartões de crédito, etc.
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
                {isLoading ? 'Carregando...' : 'Buscar Contas'}
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
          {accounts.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">
                      {accounts.length} conta(s) encontrada(s)
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
          {!showJsonView && accounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contas Encontradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Número</TableHead>
                        <TableHead>Saldo Atual</TableHead>
                        <TableHead>Saldo Disponível</TableHead>
                        <TableHead>Instituição</TableHead>
                        <TableHead>Atualizado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">
                            {account.name}
                          </TableCell>
                          <TableCell>
                            <Badge className={getAccountTypeColor(account.type)}>
                              {account.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {account.number}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(account.balance.current, account.currency)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(account.balance.available, account.currency)}
                          </TableCell>
                          <TableCell>
                            {account.institution.name}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(account.collected_at)}
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
          {(showJsonView || accounts.length === 0) && (
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
          <strong>Dica:</strong> As contas listadas aqui podem ser usadas para buscar 
          transações específicas na aba "Obter Transações". Anote os IDs das contas 
          que você deseja consultar.
        </AlertDescription>
      </Alert>
    </div>
  );
}