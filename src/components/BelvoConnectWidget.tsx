import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const { toast } = useToast();

  // Load Belvo SDK dynamically
  useEffect(() => {
    const loadBelvoSDK = () => {
      if (window.belvoSDK) {
        console.log('Belvo SDK already loaded');
        setSdkLoaded(true);
        return;
      }

      const sdkUrl = 'https://cdn.belvo.io/belvo-widget-1-stable.js';
      console.log('Loading Belvo SDK from:', sdkUrl);

      const script = document.createElement('script');
      script.src = sdkUrl;
      script.async = true;
      script.onload = () => {
        console.log('Belvo SDK loaded successfully from stable URL');
        setSdkLoaded(true);
      };
      script.onerror = (event) => {
        console.error('Failed to load Belvo SDK from stable URL:', event);
        console.error('Script element:', script);
        setError('Falha ao carregar o SDK da Belvo');
      };
      
      document.head.appendChild(script);
    };

    loadBelvoSDK();
  }, []);

  // Get access token from our API
  const getAccessToken = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Requesting access token from Belvo API');
      
      const { data, error: functionError } = await supabase.functions.invoke('belvo-token');
      
      if (functionError) {
        console.error('Function error:', functionError);
        throw new Error('Erro ao obter token de acesso');
      }

      if (!data?.access_token) {
        console.error('No access token in response:', data);
        throw new Error('Token de acesso não recebido');
      }

      console.log('Access token received successfully');
      setAccessToken(data.access_token);
      
      return data.access_token;
    } catch (err) {
      console.error('Error getting access token:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
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
      console.log('Initializing Belvo widget');

      const widget = window.belvoSDK!.createWidget({
        callback: (link) => {
          console.log('Belvo connection successful! Link ID:', link.id);
          toast({
            title: "Conexão realizada com sucesso!",
            description: `Link ID: ${link.id}`,
          });
        },
        onExit: (link) => {
          console.log('Belvo widget closed', link ? `Link ID: ${link.id}` : 'No link created');
        },
        onError: (error) => {
          console.error('Belvo widget error:', error);
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
      console.error('Error opening Belvo widget:', err);
      setError('Erro ao abrir widget da Belvo');
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
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={openBelvoWidget}
          disabled={!sdkLoaded || isLoading}
          className="w-full"
        >
          {isLoading ? (
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

        <div className="text-xs text-muted-foreground">
          <p>✓ Ambiente sandbox (teste)</p>
          <p>✓ Bancos brasileiros suportados</p>
          <p>✓ Conexão segura e criptografada</p>
        </div>
      </CardContent>
    </Card>
  );
}
