
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Função para fazer requisição com retry e headers apropriados
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Tentativa ${attempt} de ${maxRetries} para ${url}`);
      
      // Headers mais realistas para evitar bloqueio do Cloudflare
      const enhancedOptions = {
        ...options,
        headers: {
          ...options.headers,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'cross-site',
        },
      };

      const response = await fetch(url, enhancedOptions);
      
      console.log(`Resposta recebida - Status: ${response.status}, StatusText: ${response.statusText}`);
      console.log(`Headers da resposta:`, Object.fromEntries(response.headers.entries()));
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Tentativa ${attempt} falhou:`, lastError.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Backoff exponencial
        console.log(`Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Todas as tentativas falharam');
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Iniciando requisição de token Belvo ===');

    const belvoSecretId = Deno.env.get('BELVO_SECRET_ID');
    const belvoSecretPassword = Deno.env.get('BELVO_SECRET_PASSWORD');

    if (!belvoSecretId || !belvoSecretPassword) {
      console.error('Credenciais Belvo não encontradas no ambiente');
      return new Response(
        JSON.stringify({ error: 'Missing Belvo credentials' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Credenciais Belvo encontradas:', {
      secretIdLength: belvoSecretId.length,
      secretPasswordLength: belvoSecretPassword.length,
      secretIdPrefix: belvoSecretId.substring(0, 8) + '...'
    });

    // Create base64 encoded credentials for Basic Auth
    const credentials = btoa(`${belvoSecretId}:${belvoSecretPassword}`);
    console.log('Credenciais codificadas geradas, comprimento:', credentials.length);

    const belvoApiUrl = 'https://sandbox.belvo.com/api/tokens/';
    console.log('Fazendo requisição para:', belvoApiUrl);

    // Request access token from Belvo com retry logic
    const belvoResponse = await fetchWithRetry(belvoApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (!belvoResponse.ok) {
      const errorText = await belvoResponse.text();
      console.error('Erro da API Belvo:', {
        status: belvoResponse.status,
        statusText: belvoResponse.statusText,
        headers: Object.fromEntries(belvoResponse.headers.entries()),
        body: errorText.substring(0, 500) + (errorText.length > 500 ? '...' : '')
      });

      // Verificar se é um erro de bloqueio do Cloudflare
      if (errorText.includes('Cloudflare') || errorText.includes('blocked')) {
        console.error('Detectado bloqueio do Cloudflare');
        return new Response(
          JSON.stringify({ 
            error: 'Belvo API temporarily blocked by security service',
            details: 'The request was blocked by Cloudflare. This might be temporary.' 
          }),
          { 
            status: 503, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          error: 'Failed to get Belvo access token',
          status: belvoResponse.status,
          statusText: belvoResponse.statusText
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const belvoData = await belvoResponse.json();
    console.log('Token Belvo recebido com sucesso:', {
      hasAccessToken: !!belvoData.access,
      tokenLength: belvoData.access?.length || 0,
      tokenPrefix: belvoData.access?.substring(0, 20) + '...' || 'N/A'
    });

    return new Response(
      JSON.stringify({ access_token: belvoData.access }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('=== Erro crítico na função belvo-token ===');
    console.error('Tipo do erro:', error.constructor.name);
    console.error('Mensagem:', error.message);
    console.error('Stack trace:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
