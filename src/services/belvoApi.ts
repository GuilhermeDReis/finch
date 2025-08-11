// ============================================================================
// BELVO API SERVICE - Camada de Serviço Frontend
// ============================================================================
// Implementação completa da comunicação com a API Belvo
// Inclui: autenticação, tratamento de erros, cache, retry e logging
// ============================================================================

// Configuração base da API Belvo
const BELVO_BASE_URL = 'https://sandbox.belvo.com';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface BelvoApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
}

interface RequestConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

interface CacheItem {
  data: any;
  timestamp: number;
}

// Configuração padrão
const DEFAULT_CONFIG: BelvoApiConfig = {
  baseUrl: BELVO_BASE_URL,
  timeout: 30000,
  retryAttempts: 3
};

// ============================================================================
// SISTEMA DE CACHE
// ============================================================================

class BelvoCache {
  private cache = new Map<string, CacheItem>();
  private ttl = 5 * 60 * 1000; // 5 minutos

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  generateKey(endpoint: string, method: string, bodyData: any): string {
    return `${method}:${endpoint}:${JSON.stringify(bodyData)}`;
  }
}

// Instância global do cache
const cache = new BelvoCache();

// ============================================================================
// UTILITÁRIOS DE VALIDAÇÃO E SANITIZAÇÃO
// ============================================================================

function validateApiKey(belvoApiKey: string): void {
  if (!belvoApiKey) {
    throw new Error("Chave API Belvo não configurada.");
  }
  
  if (!belvoApiKey.includes(':')) {
    throw new Error("Formato de chave API inválido. Use: client_id:client_secret");
  }
}

function sanitizeForLog(data: any): any {
  if (!data) return data;
  
  const sanitized = { ...data };
  
  // Remover dados sensíveis dos logs
  if (sanitized.password) sanitized.password = '***';
  if (sanitized.client_secret) sanitized.client_secret = '***';
  if (sanitized.private_key) sanitized.private_key = '***';
  
  return sanitized;
}

function validateCreateLinkParams(params: {
  institutionId: string;
  username: string;
  password_val: string;
  accessMode: string;
}): void {
  if (!params.institutionId) throw new Error('Institution ID é obrigatório');
  if (!params.username) throw new Error('Username é obrigatório');
  if (!params.password_val) throw new Error('Password é obrigatório');
  if (!params.accessMode) throw new Error('Access Mode é obrigatório');
}

function validateGetAccountsParams(params: { linkId: string }): void {
  if (!params.linkId) throw new Error('Link ID é obrigatório');
}

function validateGetTransactionsParams(params: {
  linkId: string;
  dateFrom: string;
  dateTo: string;
}): void {
  if (!params.linkId) throw new Error('Link ID é obrigatório');
  if (!params.dateFrom) throw new Error('Data inicial é obrigatória');
  if (!params.dateTo) throw new Error('Data final é obrigatória');
  
  // Validar formato de data (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(params.dateFrom)) {
    throw new Error('Formato de data inicial inválido. Use YYYY-MM-DD');
  }
  if (!dateRegex.test(params.dateTo)) {
    throw new Error('Formato de data final inválido. Use YYYY-MM-DD');
  }
  
  // Validar se data inicial é anterior à final
  if (new Date(params.dateFrom) > new Date(params.dateTo)) {
    throw new Error('Data inicial deve ser anterior à data final');
  }
}

// ============================================================================
// INTERCEPTADORES E MIDDLEWARE
// ============================================================================

function requestInterceptor(config: RequestConfig): RequestConfig {
  console.log(`🚀 [BELVO API] ${config.method} ${config.url}`, {
    headers: { ...config.headers, Authorization: '[HIDDEN]' },
    body: config.body ? sanitizeForLog(JSON.parse(config.body)) : undefined
  });
  return config;
}

function responseInterceptor(response: Response, responseData: any): void {
  console.log(`📥 [BELVO API] Response ${response.status}`, {
    status: response.status,
    statusText: response.statusText,
    data: sanitizeForLog(responseData)
  });
}

// ============================================================================
// SISTEMA DE RETRY
// ============================================================================

async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      console.warn(`⚠️ [BELVO API] Tentativa ${attempt}/${maxAttempts} falhou:`, error.message);
      
      // Se é o último attempt ou erro não é recuperável, lança o erro
      if (attempt === maxAttempts || !isRetryableError(error)) {
        throw error;
      }
      
      // Aguarda antes da próxima tentativa (backoff exponencial)
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  throw new Error('Max retry attempts reached');
}

function isRetryableError(error: any): boolean {
  // Erros que podem ser recuperados com retry
  const retryableErrors = [
    'network error',
    'timeout',
    'service_unavailable',
    'internal_server_error'
  ];
  
  const errorMessage = error.message?.toLowerCase() || '';
  return retryableErrors.some(retryable => errorMessage.includes(retryable));
}

// ============================================================================
// FUNÇÃO CORE: callBelvoApi
// ============================================================================

export async function callBelvoApi(
  endpoint: string,
  method: string,
  belvoApiKey: string,
  bodyData: any = {}
): Promise<any> {
  // Validação de entrada
  validateApiKey(belvoApiKey);
  
  // Verificar cache para requisições GET
  if (method === 'GET') {
    const cacheKey = cache.generateKey(endpoint, method, bodyData);
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`💾 [BELVO API] Cache hit para ${endpoint}`);
      return cachedData;
    }
  }
  
  // Construção da URL completa
  const url = `${BELVO_BASE_URL}${endpoint}`;
  
  // Operação com retry
  return withRetry(async () => {
    try {
      // Geração do cabeçalho Authorization
      const base64Credentials = btoa(belvoApiKey);
      const headers = {
        "Authorization": `Basic ${base64Credentials}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      };
      
      // Configuração da requisição
      const requestConfig: RequestConfig = {
        url,
        method,
        headers,
        body: Object.keys(bodyData).length > 0 ? JSON.stringify(bodyData) : undefined
      };
      
      // Interceptador de requisição
      requestInterceptor(requestConfig);
      
      // Execução da requisição fetch
      const response = await fetch(url, {
        method,
        headers,
        body: requestConfig.body
      });
      
      // Parsing JSON - sempre tenta parsear, mesmo em erro
      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        responseData = { message: 'Erro ao parsear resposta JSON', details: await response.text() };
      }
      
      // Interceptador de resposta
      responseInterceptor(response, responseData);
      
      // Verificação de sucesso
      if (!response.ok) {
        // Extração da mensagem de erro detalhada
        const belvoErrorDetail = 
          responseData.message || 
          responseData.detail || 
          responseData.code || 
          responseData.error ||
          `HTTP ${response.status}: ${response.statusText}`;
        
        throw new Error(`Erro ${response.status}: ${belvoErrorDetail}`);
      }
      
      // Cache para requisições GET bem-sucedidas
      if (method === 'GET') {
        const cacheKey = cache.generateKey(endpoint, method, bodyData);
        cache.set(cacheKey, responseData);
      }
      
      // Retorno de sucesso
      return responseData;
      
    } catch (error: any) {
      console.error('❌ [BELVO API] Erro na chamada:', error);
      throw error; // Propaga o erro para o frontend
    }
  });
}

// ============================================================================
// FUNÇÕES ESPECÍFICAS DOS ENDPOINTS
// ============================================================================

/**
 * Criar Link com Instituição Financeira
 */
export async function createLink(
  belvoApiKey: string, 
  institutionId: string, 
  username: string, 
  password_val: string, 
  accessMode: string
): Promise<any> {
  // Validação de parâmetros
  validateCreateLinkParams({ institutionId, username, password_val, accessMode });
  
  console.log(`🔗 [BELVO API] Criando link para instituição: ${institutionId}`);
  
  return callBelvoApi("/api/links/", "POST", belvoApiKey, {
    institution: institutionId,
    username,
    password: password_val,
    access_mode: accessMode
  });
}

/**
 * Obter Contas de um Link
 */
export async function getAccounts(
  belvoApiKey: string, 
  linkId: string
): Promise<any[]> {
  // Validação de parâmetros
  validateGetAccountsParams({ linkId });
  
  console.log(`🏦 [BELVO API] Obtendo contas para link: ${linkId}`);
  
  return callBelvoApi("/api/accounts/", "POST", belvoApiKey, {
    link: linkId
  });
}

/**
 * Obter Transações de um Link
 */
export async function getTransactions(
  belvoApiKey: string, 
  linkId: string, 
  dateFrom: string, 
  dateTo: string
): Promise<any[]> {
  // Validação de parâmetros
  validateGetTransactionsParams({ linkId, dateFrom, dateTo });
  
  console.log(`💳 [BELVO API] Obtendo transações para link: ${linkId} (${dateFrom} a ${dateTo})`);
  
  return callBelvoApi("/api/transactions/", "POST", belvoApiKey, {
    link: linkId,
    date_from: dateFrom,
    date_to: dateTo
  });
}

/**
 * Testar Conexão com a API Belvo
 */
export async function testConnection(belvoApiKey: string): Promise<boolean> {
  try {
    console.log(`🔍 [BELVO API] Testando conexão...`);
    
    await callBelvoApi("/api/institutions/", "GET", belvoApiKey);
    
    console.log(`✅ [BELVO API] Conexão bem-sucedida`);
    return true;
  } catch (error) {
    console.log(`❌ [BELVO API] Falha na conexão:`, error);
    return false;
  }
}

// ============================================================================
// UTILITÁRIOS EXPORTADOS
// ============================================================================

/**
 * Limpar cache da API
 */
export function clearCache(): void {
  cache.clear();
  console.log(`🧹 [BELVO API] Cache limpo`);
}

/**
 * Obter estatísticas do cache
 */
export function getCacheStats(): { size: number; keys: string[] } {
  const keys = Array.from(cache['cache'].keys());
  return {
    size: keys.length,
    keys
  };
}

// ============================================================================
// EXPORTS PRINCIPAIS
// ============================================================================
// Todas as funções já são exportadas individualmente acima

// Export default para compatibilidade
export default {
  callBelvoApi,
  createLink,
  getAccounts,
  clearCache,
  getCacheStats
};