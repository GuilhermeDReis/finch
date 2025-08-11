import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BelvoConfig, BelvoContextType, BelvoEndpoint } from '@/types/belvo';

const defaultConfig: BelvoConfig = {
  apiKey: '',
  baseUrl: 'https://sandbox.belvo.com',
  environment: 'sandbox'
};

const BelvoConfigContext = createContext<BelvoContextType | undefined>(undefined);

interface BelvoConfigProviderProps {
  children: ReactNode;
}

export function BelvoConfigProvider({ children }: BelvoConfigProviderProps) {
  const [config, setConfigState] = useState<BelvoConfig>(defaultConfig);
  const [currentLinkId, setCurrentLinkId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>(BelvoEndpoint.CREATE_LINK);

  // Carregar configuração do localStorage na inicialização
  useEffect(() => {
    const savedConfig = localStorage.getItem('belvo-config');
    const savedLinkId = localStorage.getItem('belvo-current-link-id');
    const savedActiveTab = localStorage.getItem('belvo-active-tab');

    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setConfigState({ ...defaultConfig, ...parsedConfig });
      } catch (error) {
        console.warn('Erro ao carregar configuração Belvo do localStorage:', error);
      }
    }

    if (savedLinkId) {
      setCurrentLinkId(savedLinkId);
    }

    if (savedActiveTab) {
      setActiveTab(savedActiveTab);
    }
  }, []);

  // Função para atualizar configuração com persistência
  const setConfig = (newConfig: BelvoConfig) => {
    setConfigState(newConfig);
    
    // Salvar no localStorage (exceto a chave API por segurança em produção)
    const configToSave = {
      baseUrl: newConfig.baseUrl,
      environment: newConfig.environment,
      // NOTA: Em produção, NUNCA salvar apiKey no localStorage
      // Para esta tela de teste, mantemos para conveniência
      ...(newConfig.environment === 'sandbox' && { apiKey: newConfig.apiKey })
    };
    
    localStorage.setItem('belvo-config', JSON.stringify(configToSave));
  };

  // Função para atualizar Link ID atual com persistência
  const setCurrentLinkIdWithPersistence = (linkId: string) => {
    setCurrentLinkId(linkId);
    localStorage.setItem('belvo-current-link-id', linkId);
  };

  // Função para atualizar aba ativa com persistência
  const setActiveTabWithPersistence = (tab: string) => {
    setActiveTab(tab);
    localStorage.setItem('belvo-active-tab', tab);
  };

  // Função para limpar dados sensíveis
  const clearSensitiveData = () => {
    setConfigState(prev => ({ ...prev, apiKey: '' }));
    setCurrentLinkId('');
    localStorage.removeItem('belvo-config');
    localStorage.removeItem('belvo-current-link-id');
  };

  const value: BelvoContextType = {
    config,
    currentLinkId,
    activeTab,
    setConfig,
    setCurrentLinkId: setCurrentLinkIdWithPersistence,
    setActiveTab: setActiveTabWithPersistence
  };

  return (
    <BelvoConfigContext.Provider value={value}>
      {children}
    </BelvoConfigContext.Provider>
  );
}

// Hook personalizado para usar o contexto
export function useBelvoConfig() {
  const context = useContext(BelvoConfigContext);
  if (context === undefined) {
    throw new Error('useBelvoConfig deve ser usado dentro de um BelvoConfigProvider');
  }
  return context;
}

// Hook para verificar se a configuração está válida
export function useBelvoConfigValidation() {
  const { config } = useBelvoConfig();
  
  const isConfigValid = () => {
    return config.apiKey.trim() !== '' && 
           config.apiKey.includes(':') && 
           config.baseUrl.trim() !== '';
  };

  const getConfigErrors = (): string[] => {
    const errors: string[] = [];
    
    if (!config.apiKey.trim()) {
      errors.push('Chave API é obrigatória');
    } else if (!config.apiKey.includes(':')) {
      errors.push('Chave API deve estar no formato client_id:client_secret');
    }
    
    if (!config.baseUrl.trim()) {
      errors.push('URL base é obrigatória');
    }
    
    return errors;
  };

  return {
    isValid: isConfigValid(),
    errors: getConfigErrors()
  };
}