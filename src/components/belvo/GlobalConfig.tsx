import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Eye, EyeOff, Save, TestTube, ArrowRight } from 'lucide-react';
import { useBelvoConfig, useBelvoConfigValidation } from '@/contexts/BelvoConfigContext';
import { useBelvoApi } from '@/hooks/useBelvoApi';
import { BelvoEndpoint } from '@/types/belvo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export function GlobalConfig() {
  const { config, setConfig, setActiveTab } = useBelvoConfig();
  const { testConnectionDirect, isLoading, error, clearError } = useBelvoApi();
  
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Validação local baseada no valor atual do campo
  const isCurrentApiKeyValid = () => {
    return apiKey.trim() !== '' && 
           apiKey.includes(':') && 
           config.baseUrl.trim() !== '';
  };

  const getCurrentApiKeyErrors = (): string[] => {
    const errors: string[] = [];
    
    if (!apiKey.trim()) {
      errors.push('Chave API é obrigatória');
    } else if (!apiKey.includes(':')) {
      errors.push('Chave API deve estar no formato client_id:client_secret');
    }
    
    if (!config.baseUrl.trim()) {
      errors.push('URL base é obrigatória');
    }
    
    return errors;
  };

  const isValid = isCurrentApiKeyValid();
  const errors = getCurrentApiKeyErrors();

  // Detectar mudanças não salvas
  useEffect(() => {
    setHasUnsavedChanges(apiKey !== config.apiKey);
  }, [apiKey, config.apiKey]);

  // Limpar status de conexão quando a chave muda
  useEffect(() => {
    if (apiKey !== config.apiKey) {
      setConnectionStatus('idle');
      clearError();
    }
  }, [apiKey, config.apiKey, clearError]);

  const handleSaveConfig = async () => {
    setSaveStatus('saving');
    
    const newConfig = {
      ...config,
      apiKey: apiKey.trim()
    };
    
    setConfig(newConfig);
    setHasUnsavedChanges(false);
    
    // Simular um pequeno delay para mostrar o feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setSaveStatus('saved');
    setConnectionStatus('idle');
    
    // Após 2 segundos, redirecionar para a próxima etapa
    setTimeout(() => {
      setSaveStatus('idle');
      setActiveTab(BelvoEndpoint.CREATE_LINK);
    }, 2000);
  };

  const handleTestConnection = async () => {
    if (!isValid) {
      return;
    }

    // Limpar erro anterior
    clearError();

    try {
      const result = await testConnectionDirect();
      
      if (result) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('error');
      }
    } catch (err) {
      console.error('Erro ao testar conexão:', err);
      setConnectionStatus('error');
    }
  };

  const formatApiKey = (key: string) => {
    if (!key || !key.includes(':')) return key;
    const [clientId, secret] = key.split(':');
    return `${clientId}:${'*'.repeat(Math.min(secret.length, 20))}`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Configuração da API Belvo
              {isValid && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Configurada
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Configure suas credenciais para acessar a API Belvo
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Ambiente Sandbox */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <TestTube className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-900 dark:text-blue-100">
              Ambiente Sandbox
            </span>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
            URL Base: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">
              {config.baseUrl}
            </code>
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Este ambiente é seguro para testes e não afeta dados reais.
          </p>
        </div>

        {/* Aviso de Segurança */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> Esta é uma tela de teste. Em produção, 
            as credenciais devem ser gerenciadas pelo backend por questões de segurança.
          </AlertDescription>
        </Alert>

        {/* Campo da Chave API */}
        <div className="space-y-2">
          <Label htmlFor="apiKey">
            Chave API (client_id:client_secret)
          </Label>
          <div className="relative">
            <Input
              id="apiKey"
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="seu_client_id:seu_client_secret"
              className={`pr-10 ${errors.length > 0 ? 'border-red-500' : ''}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* Exibir chave formatada quando oculta */}
          {!showApiKey && apiKey && (
            <p className="text-xs text-muted-foreground">
              Chave atual: {formatApiKey(apiKey)}
            </p>
          )}
        </div>

        {/* Erros de Validação */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
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

        {/* Status de Salvamento */}
        {saveStatus === 'saved' && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-300 flex items-center justify-between">
              <span>Configuração salva com sucesso! Redirecionando para criar link...</span>
              <ArrowRight className="h-4 w-4 animate-pulse" />
            </AlertDescription>
          </Alert>
        )}

        {/* Status de Conexão */}
        {connectionStatus === 'success' && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              Conexão testada com sucesso! A API está respondendo corretamente.
            </AlertDescription>
          </Alert>
        )}

        {/* Botões de Ação */}
        <div className="flex gap-3">
          <Button
            onClick={handleSaveConfig}
            disabled={!hasUnsavedChanges || errors.length > 0 || saveStatus === 'saving'}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saveStatus === 'saving' ? 'Salvando...' : 'Salvar Configuração'}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={!isValid || isLoading}
            className="flex items-center gap-2"
          >
            <TestTube className="w-4 h-4" />
            {isLoading ? 'Testando...' : 'Testar Conexão'}
          </Button>
        </div>

        {/* Próximos Passos */}
        {isValid && saveStatus === 'idle' && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              Próximos Passos:
            </h4>
            <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-medium">1</div>
                <span>Criar Link - Conectar com uma instituição financeira</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-200 text-blue-600 text-xs flex items-center justify-center font-medium">2</div>
                <span>Obter Contas - Listar contas do link criado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-200 text-blue-600 text-xs flex items-center justify-center font-medium">3</div>
                <span>Obter Transações - Buscar transações das contas</span>
              </div>
            </div>
          </div>
        )}

        {/* Informações Adicionais */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• A chave API deve estar no formato: client_id:client_secret</p>
          <p>• Você pode obter suas credenciais no dashboard da Belvo</p>
          <p>• As configurações são salvas localmente para conveniência</p>
        </div>
      </CardContent>
    </Card>
  );
}