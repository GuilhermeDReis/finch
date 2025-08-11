// Tipos para configuração e estado da API Belvo
export interface BelvoConfig {
  apiKey: string; // client_id:client_secret format
  baseUrl: string;
  environment: 'sandbox' | 'production';
}

export interface BelvoContextType {
  config: BelvoConfig;
  currentLinkId: string;
  activeTab: string;
  setConfig: (config: BelvoConfig) => void;
  setCurrentLinkId: (linkId: string) => void;
  setActiveTab: (tab: string) => void;
}

// Tipos para parâmetros dos endpoints
export interface LinkCreationParams {
  institution: string;
  username: string;
  password: string;
  access_mode: 'single' | 'recurrent';
  username_type?: string;
  certificate?: string;
  private_key?: string;
}

export interface AccountsParams {
  link: string;
  page?: number;
  page_size?: number;
}

export interface TransactionsParams {
  link: string;
  account?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

// Tipos para respostas da API
export interface BelvoLink {
  id: string;
  institution: string;
  access_mode: string;
  last_accessed_at: string;
  status: string;
  created_by: string;
  refresh_rate: string;
}

export interface BelvoAccount {
  id: string;
  link: string;
  institution: {
    name: string;
    type: string;
  };
  collected_at: string;
  category: string;
  type: string;
  name: string;
  number: string;
  balance: {
    current: number;
    available: number;
  };
  currency: string;
  public_identification_name: string;
  public_identification_value: string;
}

export interface BelvoTransaction {
  id: string;
  account: string;
  collected_at: string;
  value_date: string;
  accounting_date: string;
  amount: number;
  balance: number;
  currency: string;
  description: string;
  observations: string;
  merchant?: {
    name: string;
    website: string;
  };
  category: string;
  subcategory: string;
  reference: string;
  type: string;
  status: string;
}

// Tipos para tratamento de erros granular
export interface BelvoErrorDetail {
  code: string;
  message: string;
  request_id: string;
}

export interface BelvoApiError {
  detail: string;
  code: string;
  message: string;
  request_id: string;
  field?: string;
}

export interface BelvoErrorResponse {
  detail?: string;
  code?: string;
  message?: string;
  request_id?: string;
  errors?: BelvoApiError[];
}

// Tipos para respostas padronizadas
export interface BelvoApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    type: 'network' | 'api' | 'validation' | 'auth' | 'rate_limit' | 'unknown';
    code?: string;
    message: string;
    details?: string;
    requestId?: string;
  };
  meta?: {
    count: number;
    next: string | null;
    previous: string | null;
  };
}

// Tipos para estados de loading
export interface LoadingState {
  isLoading: boolean;
  operation?: string;
}

// Tipos para validação
export interface ValidationError {
  field: string;
  message: string;
}

// Enums para melhor type safety
export enum BelvoEndpoint {
  CREATE_LINK = 'createLink',
  GET_ACCOUNTS = 'getAccounts',
  GET_TRANSACTIONS = 'getTransactions'
}

export enum BelvoInstitution {
  BANORTE = 'banorte_mx_retail',
  BBVA = 'bbva_mx_retail',
  SANTANDER = 'santander_mx_retail',
  BANAMEX = 'banamex_mx_retail',
  HSBC = 'hsbc_mx_retail'
}

export enum AccessMode {
  SINGLE = 'single',
  RECURRENT = 'recurrent'
}