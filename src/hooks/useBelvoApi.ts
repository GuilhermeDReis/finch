import { useState, useCallback } from 'react';
import { useBelvoConfig } from '@/contexts/BelvoConfigContext';
import { getBelvoService } from '@/services/belvoService';
import * as belvoApi from '@/services/belvoApi';
import { 
  BelvoApiResponse, 
  LinkCreationParams, 
  AccountsParams, 
  TransactionsParams,
  BelvoLink,
  BelvoAccount,
  BelvoTransaction,
  LoadingState
} from '@/types/belvo';

interface UseBelvoApiReturn {
  // Estados
  isLoading: boolean;
  error: string | null;
  
  // Métodos (API Original - compatibilidade)
  createLink: (params: LinkCreationParams) => Promise<BelvoApiResponse<BelvoLink>>;
  getAccounts: (params: AccountsParams) => Promise<BelvoApiResponse<BelvoAccount[]>>;
  getTransactions: (params: TransactionsParams) => Promise<BelvoApiResponse<BelvoTransaction[]>>;
  testConnection: () => Promise<BelvoApiResponse<any>>;
  
  // Métodos (Nova API - belvoApi.ts)
  createLinkDirect: (institutionId: string, username: string, password: string, accessMode: string) => Promise<any>;
  getAccountsDirect: (linkId: string) => Promise<any[]>;
  getTransactionsDirect: (linkId: string, dateFrom: string, dateTo: string) => Promise<any[]>;
  testConnectionDirect: () => Promise<boolean>;
  
  // Utilitários
  clearError: () => void;
  clearCache: () => void;
}

export function useBelvoApi(): UseBelvoApiReturn {
  const { config } = useBelvoConfig();
  const [loadingState, setLoadingState] = useState<LoadingState>({ isLoading: false });
  const [error, setError] = useState<string | null>(null);

  // Função auxiliar para executar operações com loading e tratamento de erro
  const executeWithLoading = useCallback(async <T>(
    operation: () => Promise<BelvoApiResponse<T>>,
    operationName: string
  ): Promise<BelvoApiResponse<T>> => {
    setLoadingState({ isLoading: true, operation: operationName });
    setError(null);

    try {
      const service = getBelvoService(config);
      const result = await operation();

      if (!result.success && result.error) {
        setError(result.error.message);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro inesperado';
      setError(errorMessage);
      
      return {
        success: false,
        error: {
          type: 'unknown',
          message: errorMessage
        }
      };
    } finally {
      setLoadingState({ isLoading: false });
    }
  }, [config]);

  // Criar Link
  const createLink = useCallback(async (params: LinkCreationParams): Promise<BelvoApiResponse<BelvoLink>> => {
    return executeWithLoading(
      () => getBelvoService(config).createLink(params),
      'Criando link...'
    );
  }, [config, executeWithLoading]);

  // Obter Contas
  const getAccounts = useCallback(async (params: AccountsParams): Promise<BelvoApiResponse<BelvoAccount[]>> => {
    return executeWithLoading(
      () => getBelvoService(config).getAccounts(params),
      'Carregando contas...'
    );
  }, [config, executeWithLoading]);

  // Obter Transações
  const getTransactions = useCallback(async (params: TransactionsParams): Promise<BelvoApiResponse<BelvoTransaction[]>> => {
    return executeWithLoading(
      () => getBelvoService(config).getTransactions(params),
      'Carregando transações...'
    );
  }, [config, executeWithLoading]);

  // Testar Conexão
  const testConnection = useCallback(async (): Promise<BelvoApiResponse<any>> => {
    return executeWithLoading(
      () => getBelvoService(config).testConnection(),
      'Testando conexão...'
    );
  }, [config, executeWithLoading]);

  // ============================================================================
  // NOVOS MÉTODOS DIRETOS (belvoApi.ts)
  // ============================================================================

  // Criar Link Direto
  const createLinkDirect = useCallback(async (
    institutionId: string, 
    username: string, 
    password: string, 
    accessMode: string
  ): Promise<any> => {
    setLoadingState({ isLoading: true, operation: 'Criando link...' });
    setError(null);

    try {
      const result = await belvoApi.createLink(
        config.apiKey, 
        institutionId, 
        username, 
        password, 
        accessMode
      );
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro inesperado';
      setError(errorMessage);
      throw err;
    } finally {
      setLoadingState({ isLoading: false });
    }
  }, [config.apiKey]);

  // Obter Contas Direto
  const getAccountsDirect = useCallback(async (linkId: string): Promise<any[]> => {
    setLoadingState({ isLoading: true, operation: 'Carregando contas...' });
    setError(null);

    try {
      const result = await belvoApi.getAccounts(config.apiKey, linkId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro inesperado';
      setError(errorMessage);
      throw err;
    } finally {
      setLoadingState({ isLoading: false });
    }
  }, [config.apiKey]);

  // Obter Transações Direto
  const getTransactionsDirect = useCallback(async (
    linkId: string, 
    dateFrom: string, 
    dateTo: string
  ): Promise<any[]> => {
    setLoadingState({ isLoading: true, operation: 'Carregando transações...' });
    setError(null);

    try {
      const result = await belvoApi.getTransactions(config.apiKey, linkId, dateFrom, dateTo);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro inesperado';
      setError(errorMessage);
      throw err;
    } finally {
      setLoadingState({ isLoading: false });
    }
  }, [config.apiKey]);

  // Testar Conexão Direto
  const testConnectionDirect = useCallback(async (): Promise<boolean> => {
    setLoadingState({ isLoading: true, operation: 'Testando conexão...' });
    setError(null);

    try {
      const result = await belvoApi.testConnection(config.apiKey);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro inesperado';
      setError(errorMessage);
      return false;
    } finally {
      setLoadingState({ isLoading: false });
    }
  }, [config.apiKey]);

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Limpar cache
  const clearCache = useCallback(() => {
    belvoApi.clearCache();
  }, []);

  return {
    isLoading: loadingState.isLoading,
    error,
    // Métodos originais (compatibilidade)
    createLink,
    getAccounts,
    getTransactions,
    testConnection,
    // Novos métodos diretos
    createLinkDirect,
    getAccountsDirect,
    getTransactionsDirect,
    testConnectionDirect,
    // Utilitários
    clearError,
    clearCache
  };
}

// Hook específico para validação de parâmetros
export function useBelvoValidation() {
  const validateLinkParams = (params: LinkCreationParams): string[] => {
    const errors: string[] = [];
    
    if (!params.institution?.trim()) {
      errors.push('Instituição é obrigatória');
    }
    
    if (!params.username?.trim()) {
      errors.push('Usuário é obrigatório');
    }
    
    if (!params.password?.trim()) {
      errors.push('Senha é obrigatória');
    }
    
    if (!params.access_mode) {
      errors.push('Modo de acesso é obrigatório');
    }
    
    return errors;
  };

  const validateAccountsParams = (params: AccountsParams): string[] => {
    const errors: string[] = [];
    
    if (!params.link?.trim()) {
      errors.push('Link ID é obrigatório');
    }
    
    if (params.page && params.page < 1) {
      errors.push('Página deve ser maior que 0');
    }
    
    if (params.page_size && (params.page_size < 1 || params.page_size > 1000)) {
      errors.push('Tamanho da página deve estar entre 1 e 1000');
    }
    
    return errors;
  };

  const validateTransactionsParams = (params: TransactionsParams): string[] => {
    const errors: string[] = [];
    
    if (!params.link?.trim()) {
      errors.push('Link ID é obrigatório');
    }
    
    if (params.date_from && params.date_to) {
      const dateFrom = new Date(params.date_from);
      const dateTo = new Date(params.date_to);
      
      if (dateFrom > dateTo) {
        errors.push('Data inicial deve ser anterior à data final');
      }
      
      // Verificar se o intervalo não é muito grande (máximo 1 ano)
      const oneYearMs = 365 * 24 * 60 * 60 * 1000;
      if (dateTo.getTime() - dateFrom.getTime() > oneYearMs) {
        errors.push('Intervalo de datas não pode ser maior que 1 ano');
      }
    }
    
    if (params.page && params.page < 1) {
      errors.push('Página deve ser maior que 0');
    }
    
    if (params.page_size && (params.page_size < 1 || params.page_size > 1000)) {
      errors.push('Tamanho da página deve estar entre 1 e 1000');
    }
    
    return errors;
  };

  return {
    validateLinkParams,
    validateAccountsParams,
    validateTransactionsParams
  };
}