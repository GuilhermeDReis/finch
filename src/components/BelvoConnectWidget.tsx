import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getLogger } from '@/utils/logger';

const logger = getLogger('BelvoConnectWidget');

// Belvo Widget types
declare global {
  interface Window {
    belvoSDK?: {
      createWidget: (config: BelvoWidgetConfig) => BelvoWidget;
    };
  }
}

interface BelvoWidgetConfig {
  callback: (link: { id: string }) => void;
  onExit: (link: { id: string } | null) => void;
  onError: (error: any) => void;
  access_token: string;
  country_codes: string[];
  locale: string;
}

interface BelvoWidget {
  open: () => void;
  close: () => void;
}

export function BelvoConnectWidget() {
  const [isLoading, setIsLoading] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();

  // Load Belvo SDK dynamically
  useEffect(() => {
    const loadBelvoSDK = () => {
      if (window.belvoSDK) {
        logger.debug('Belvo SDK already loaded');
        setSdkLoaded(true);
        return;
      }

      const sdkUrl = 'https://cdn.belvo.io/belvo-widget-1-stable.js';
      logger.debug('Loading Belvo SDK from', { sdkUrl });

      const script = document.createElement('script');
      script.src = sdkUrl;
      script.async = true;
      script.onload = () => {
        logger.debug('Belvo SDK loaded successfully from stable URL');
        setSdkLoaded(true);
      };
      script.onerror = (event) => {
        logger.error('Failed to load Belvo SDK from stable URL', { event, script });
        setError('Falha ao carregar o SDK da Belvo');
      };
      
      document.head.appendChild(script);
    };

    loadBelvoSDK();
  }, []);

  // Get access token from our API with retry logic
  const getAccessToken = async (retryCount = 0) => {
    const maxRetries = 3;
    
    try {
setIsLoading(true);
    setProcessingProgress(25);
setError(null);
      setProcessingProgress(50);
      
      if (retryCount > 0) {
        setIsRetrying(true);
        logger.debug(`Tentativa ${retryCount + 1} de ${maxRetries + 1} para obter token`);
      }

      logger.debug('Solicitando token de acesso da API Belvo...');
      
      const { data, error: functionError } = await supabase.functions.invoke('belvo-token');
      
      if (functionError) {
        logger.error('Erro da função', { functionError });
        throw new Error('Erro ao chamar função de token');
      }

      if (!data) {
        logger.error('Nenhum dado retornado da função');
        throw new Error('Nenhum dado retornado');
      }

      // Verificar se é erro de bloqueio temporário
      if (data.error && data.error.includes('blocked by security service')) {
        if (retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount + 1) * 2000; // Delay maior para bloqueios
          logger.debug(`Bloqueio detectado, tentando novamente em ${delay}ms...`);
          
          toast({
            title: "Serviço temporariamente bloqueado",
            description: `Tentando novamente em ${delay/1000} segundos...`,
            variant: "destructive",
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return getAccessToken(retryCount + 1);
        } else {
          throw new Error('Serviço Belvo temporariamente indisponível. Tente novamente em alguns minutos.');
        }
      }

      if (data.error) {
        logger.error('Erro retornado pela função', { error: data.error });
        throw new Error(data.details || data.error);
      }

      if (!data.access_token) {
        logger.error('Token de acesso não recebido', { data });
        throw new Error('Token de acesso não recebido');
      }

      logger.debug('Token de acesso recebido com sucesso');
setAccessToken(data.access_token);
      setProcessingProgress(100);
      
      return data.access_token;
    } catch (err) {
      logger.error('Erro ao obter token de acesso', { err });
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      
      // Retry logic para outros tipos de erro
      if (retryCount < maxRetries && !errorMessage.includes('temporariamente indisponível')) {
        const delay = Math.pow(2, retryCount + 1) * 1000;
        logger.debug(`Erro geral, tentando novamente em ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return getAccessToken(retryCount + 1);
      }
      
      setError(errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
setIsLoading(false);
      setIsRetrying(false);
      setProcessingProgress(0);
    }
  };

  // Initialize and open Belvo widget
  const openBelvoWidget = async () => {
    if (!sdkLoaded) {
      setError('SDK da Belvo ainda não foi carregado');
      return;
    }

    let token = accessToken;
    if (!token) {
      token = await getAccessToken();
      if (!token) return;
    }

    try {
      logger.debug('Initializing Belvo widget');

      const widget = window.belvoSDK!.createWidget({
        callback: async (link) => {
          logger.info('Belvo connection successful!', { linkId: link.id });
          toast({
            title: "Conexão realizada com sucesso!",
            description: `Link ID: ${link.id}`,
          });
          
          // Start importing transactions automatically
          await importBelvoTransactions(link.id);
        },
        onExit: (link) => {
          logger.debug('Belvo widget closed', { linkId: link ? link.id : null });
        },
        onError: (error) => {
          logger.error('Belvo widget error', { error });
          setError('Erro no widget da Belvo');
          toast({
            title: "Erro no widget",
            description: "Ocorreu um erro durante a conexão bancária",
            variant: "destructive",
          });
        },
        access_token: token,
        country_codes: ['BR'],
        locale: 'pt-br',
      });

      widget.open();
    } catch (err) {
      logger.error('Error opening Belvo widget', { err });
      setError('Erro ao abrir widget da Belvo');
    }
  };

  // Import transactions from Belvo
  const importBelvoTransactions = async (linkId: string) => {
    setIsImporting(true);
    setImportProgress(0);
    setCurrentStep('Iniciando importação...');
    
    try {
      // Simulate progress steps
      setImportProgress(10);
      setCurrentStep('Buscando contas bancárias...');
      
      const { data, error } = await supabase.functions.invoke('belvo-import-transactions', {
        body: { linkId }
      });
      
      if (error) {
        throw error;
      }
      
      // Simulate step progression
      setImportProgress(50);
      setCurrentStep('Processando transações...');
      
      // Simulate final steps
      await new Promise(resolve => setTimeout(resolve, 1000));
      setImportProgress(80);
      setCurrentStep('Categorizando transações...');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      setImportProgress(100);
      setCurrentStep('Importação concluída!');
      
      toast({
        title: "Importação concluída!",
        description: `${data.summary?.transactions || 0} transações importadas com sucesso`,
        variant: "default"
      });
      
    } catch (error) {
      logger.error('Error importing Belvo transactions', { error });
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro ao importar as transações bancárias",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        setIsImporting(false);
        setImportProgress(0);
        setCurrentStep('');
      }, 2000);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Conectar Conta Bancária
        </CardTitle>
        <CardDescription>
          Conecte sua conta bancária de forma segura usando Belvo para importar transações automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
              {error.includes('temporariamente') && (
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => getAccessToken()}
                    disabled={isLoading}
                  >
                    Tentar Novamente
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={openBelvoWidget}
          disabled={!sdkLoaded || isLoading}
          className="w-full"
        >
          {isRetrying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Tentando novamente...
            </>
          ) : isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Obtendo token...
            </>
          ) : !sdkLoaded ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando SDK...
            </>
          ) : (
            <>
              <Building2 className="mr-2 h-4 w-4" />
              Conectar Banco
            </>
          )}
          </Button>

        {/* Progress indicator when loading or processing token */}
        {isLoading && (
          <div className="space-y-2">
            <Progress value={processingProgress} className="w-full" />
            <div className="text-sm text-muted-foreground text-center">
              {processingProgress < 50 ? "Iniciando conexão..." : processingProgress < 100 ? "Obtendo token de acesso..." : "Conectando..."}
            </div>
          </div>
        )}
        
        {/* Progress indicator when importing transactions */}
        {isImporting && (
          <div className="space-y-2">
            <Progress value={importProgress} className="w-full" />
            <div className="text-sm text-muted-foreground text-center">
              {currentStep}
            </div>
            <div className="text-xs text-muted-foreground text-center">
              {importProgress}% concluído
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>✓ Ambiente sandbox (teste)</p>
          <p>✓ Bancos brasileiros suportados</p>
          <p>✓ Conexão segura e criptografada</p>
          {error && error.includes('temporariamente') && (
            <p className="text-orange-600 mt-2">⚠️ Serviço pode estar temporariamente bloqueado</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
