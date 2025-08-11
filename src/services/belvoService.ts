import { 
  BelvoConfig, 
  BelvoApiResponse, 
  BelvoErrorResponse,
  LinkCreationParams,
  AccountsParams,
  TransactionsParams,
  BelvoLink,
  BelvoAccount,
  BelvoTransaction
} from '@/types/belvo';

// Mapeamento de códigos de erro para mensagens amigáveis
const ERROR_MESSAGES: Record<string, string> = {
  // Erros de autenticação
  'authentication_failed': 'Credenciais inválidas. Verifique sua chave API.',
  'invalid_client': 'Cliente inválido. Verifique o client_id.',
  'invalid_secret': 'Segredo inválido. Verifique o client_secret.',
  'unauthorized': 'Não autorizado. Verifique suas credenciais.',
  
  // Erros de instituição
  'institution_not_found': 'Instituição não encontrada.',
  'institution_unavailable': 'Instituição temporariamente indisponível.',
  'institution_down': 'Instituição fora do ar. Tente novamente mais tarde.',
  
  // Erros de credenciais do usuário
  'invalid_credentials': 'Credenciais do usuário inválidas.',
  'invalid_username': 'Nome de usuário inválido.',
  'invalid_password': 'Senha inválida.',
  'account_locked': 'Conta bloqueada. Entre em contato com sua instituição.',
  'session_expired': 'Sessão expirada. Tente novamente.',
  
  // Erros de rate limiting
  'rate_limit_exceeded': 'Limite de requisições excedido. Aguarde antes de tentar novamente.',
  'quota_exceeded': 'Cota de requisições excedida.',
  
  // Erros de link
  'link_not_found': 'Link não encontrado.',
  'link_expired': 'Link expirado. Crie um novo link.',
  'link_error': 'Erro no link. Verifique o status do link.',
  
  // Erros de conta
  'account_not_found': 'Conta não encontrada.',
  'no_accounts_found': 'Nenhuma conta encontrada para este link.',
  
  // Erros de transação
  'no_transactions_found': 'Nenhuma transação encontrada para os filtros especificados.',
  'invalid_date_range': 'Intervalo de datas inválido.',
  
  // Erros de validação
  'validation_error': 'Erro de validação nos dados enviados.',
  'missing_required_field': 'Campo obrigatório não informado.',
  'invalid_field_format': 'Formato de campo inválido.',
  
  // Erros de rede/servidor
  'internal_server_error': 'Erro interno do servidor. Tente novamente mais tarde.',
  'service_unavailable': 'Serviço temporariamente indisponível.',
  'timeout': 'Timeout na requisição. Tente novamente.',
  
  // Erro genérico
  'unknown_error': 'Erro desconhecido. Entre em contato com o suporte.'
};

class BelvoService {
  private config: BelvoConfig;

  constructor(config: BelvoConfig) {
    this.config = config;
  }

  // Atualizar configuração
  updateConfig(config: BelvoConfig) {
    this.config = config;
  }

  // Método privado para fazer requisições HTTP
  private async makeRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<BelvoApiResponse<T>> {
    try {
      // Validar configuração antes da requisição
      if (!this.config.apiKey || !this.config.apiKey.includes(':')) {
        return {
          success: false,
          error: {
            type: 'validation',
            message: 'Chave API inválida. Use o formato client_id:client_secret'
          }
        };
      }

      const url = `${this.config.baseUrl}${endpoint}`;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(this.config.apiKey)}`
      };

      const requestOptions: RequestInit = {
        method,
        headers,
        ...(body && { body: JSON.stringify(body) })
      };

      console.log(`🚀 Belvo API Request: ${method} ${url}`, {
        headers: { ...headers, Authorization: '[HIDDEN]' },
        body: body ? JSON.stringify(body, null, 2) : undefined
      });

      const response = await fetch(url, requestOptions);
      const responseData = await response.json();

      console.log(`📥 Belvo API Response: ${response.status}`, responseData);

      if (!response.ok) {
        return this.handleErrorResponse(response.status, responseData);
      }

      return {
        success: true,
        data: responseData,
        meta: responseData.meta
      };

    } catch (error) {
      console.error('❌ Belvo API Network Error:', error);
      return this.handleNetworkError(error);
    }
  }

  // Interceptador de erros para tratamento granular
  private handleErrorResponse(status: number, errorData: BelvoErrorResponse): BelvoApiResponse {
    let errorType: 'network' | 'api' | 'validation' | 'auth' | 'rate_limit' | 'unknown' = 'unknown';
    let message = 'Erro desconhecido';
    let code = '';

    // Determinar tipo de erro baseado no status HTTP
    if (status === 401 || status === 403) {
      errorType = 'auth';
    } else if (status === 429) {
      errorType = 'rate_limit';
    } else if (status >= 400 && status < 500) {
      errorType = 'validation';
    } else if (status >= 500) {
      errorType = 'api';
    }

    // Extrair informações do erro da resposta
    if (errorData.code) {
      code = errorData.code;
      message = ERROR_MESSAGES[code] || errorData.message || errorData.detail || message;
    } else if (errorData.detail) {
      message = errorData.detail;
    } else if (errorData.message) {
      message = errorData.message;
    }

    // Tratar erros múltiplos (array de erros)
    if (errorData.errors && errorData.errors.length > 0) {
      const firstError = errorData.errors[0];
      code = firstError.code;
      message = ERROR_MESSAGES[firstError.code] || firstError.message;
      
      // Se há múltiplos erros, adicionar informação
      if (errorData.errors.length > 1) {
        message += ` (e mais ${errorData.errors.length - 1} erro(s))`;
      }
    }

    return {
      success: false,
      error: {
        type: errorType,
        code,
        message,
        details: JSON.stringify(errorData, null, 2),
        requestId: errorData.request_id
      }
    };
  }

  // Tratamento de erros de rede
  private handleNetworkError(error: any): BelvoApiResponse {
    let message = 'Erro de conexão';
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      message = 'Erro de rede. Verifique sua conexão com a internet.';
    } else if (error.name === 'AbortError') {
      message = 'Requisição cancelada.';
    } else if (error.message) {
      message = error.message;
    }

    return {
      success: false,
      error: {
        type: 'network',
        message,
        details: error.toString()
      }
    };
  }

  // Endpoint: Criar Link
  async createLink(params: LinkCreationParams): Promise<BelvoApiResponse<BelvoLink>> {
    return this.makeRequest<BelvoLink>('/api/links/', 'POST', params);
  }

  // Endpoint: Obter Contas
  async getAccounts(params: AccountsParams): Promise<BelvoApiResponse<BelvoAccount[]>> {
    const queryParams = new URLSearchParams();
    queryParams.append('link', params.link);
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.page_size) queryParams.append('page_size', params.page_size.toString());

    return this.makeRequest<BelvoAccount[]>(`/api/accounts/?${queryParams.toString()}`);
  }

  // Endpoint: Obter Transações
  async getTransactions(params: TransactionsParams): Promise<BelvoApiResponse<BelvoTransaction[]>> {
    const queryParams = new URLSearchParams();
    queryParams.append('link', params.link);
    
    if (params.account) queryParams.append('account', params.account);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.page_size) queryParams.append('page_size', params.page_size.toString());

    return this.makeRequest<BelvoTransaction[]>(`/api/transactions/?${queryParams.toString()}`);
  }

  // Método para testar conectividade
  async testConnection(): Promise<BelvoApiResponse<any>> {
    return this.makeRequest('/api/links/', 'GET');
  }
}

// Instância singleton do serviço
let belvoServiceInstance: BelvoService | null = null;

export function getBelvoService(config: BelvoConfig): BelvoService {
  if (!belvoServiceInstance) {
    belvoServiceInstance = new BelvoService(config);
  } else {
    belvoServiceInstance.updateConfig(config);
  }
  return belvoServiceInstance;
}

export default BelvoService;