# Sistema de Logs Estruturados

Este documento descreve o sistema de logs estruturados implementado para o Transaction Entry Hub, explicando como usá-lo e as melhores práticas.

## Visão Geral

O sistema de logs foi projetado para fornecer uma maneira consistente e estruturada de registrar informações, avisos e erros em toda a aplicação. Ele substitui o uso direto de `console.log`, `console.error`, etc., oferecendo vários benefícios:

- **Níveis de log configuráveis**: Controle quais logs são exibidos com base no ambiente
- **Logs estruturados**: Formato consistente com timestamps, módulos e dados adicionais
- **Melhor depuração**: Informações mais detalhadas sobre erros, incluindo stack traces
- **Flexibilidade**: Fácil de estender para adicionar novos destinos de log (como serviços remotos)

## Como Usar

### Importação e Criação de Logger

```typescript
import { getLogger } from '@/utils/logger';

// Criar um logger para um componente ou serviço específico
const logger = getLogger('NomeDoComponenteOuServiço');
```

### Níveis de Log

O sistema oferece quatro níveis de log:

1. **DEBUG**: Informações detalhadas úteis durante o desenvolvimento
2. **INFO**: Eventos normais do sistema que mostram o progresso da aplicação
3. **WARN**: Situações potencialmente problemáticas que merecem atenção
4. **ERROR**: Erros que precisam ser investigados

### Exemplos de Uso

```typescript
// Log de debug - informações detalhadas para desenvolvimento
logger.debug('Inicializando componente', { props: { id: 123, name: 'Exemplo' } });

// Log de informação - eventos normais do sistema
logger.info('Componente carregado com sucesso');

// Log de aviso - situações que merecem atenção mas não são erros
logger.warn('Propriedade obsoleta sendo usada', { prop: 'oldProp', alternative: 'newProp' });

// Log de erro com objeto Error
try {
  throw new Error('Falha ao carregar dados');
} catch (error) {
  logger.error(error as Error, { context: 'Durante a inicialização' });
}

// Log de erro com mensagem personalizada
logger.error('Falha na operação', { operationId: 'op-123', status: 'failed' });
```

## Configuração

O sistema de logs pode ser configurado globalmente para ajustar seu comportamento:

```typescript
import { configureLogger, LogLevel } from '@/utils/logger';

// Configurar o logger
configureLogger({
  // Nível mínimo de log a ser exibido
  minLevel: LogLevel.INFO,
  // Habilitar/desabilitar saída no console
  enableConsole: true,
  // Usar ícones nos logs
  useIcons: true,
  // Mostrar timestamps nos logs
  showTimestamps: true,
  // Mostrar nome do módulo nos logs
  showModule: true,
});
```

## Melhores Práticas

1. **Crie um logger por módulo/componente**: Isso ajuda a identificar a origem dos logs

2. **Use o nível apropriado**:
   - `debug`: Para informações detalhadas úteis durante o desenvolvimento
   - `info`: Para eventos normais que mostram o progresso da aplicação
   - `warn`: Para situações potencialmente problemáticas
   - `error`: Para erros que precisam ser investigados

3. **Inclua contexto relevante**: Adicione dados estruturados que ajudem a entender o contexto

4. **Capture objetos Error completos**: Use `logger.error(error)` em vez de `logger.error(error.message)`

5. **Evite logs excessivos**: Logs demais podem prejudicar o desempenho e dificultar a identificação de problemas reais

## Migração de console.log

Para migrar de `console.log` para o novo sistema de logs:

```typescript
// Antes
console.log('Carregando dados para o usuário:', userId);
console.error('Falha ao carregar dados:', error);

// Depois
const logger = getLogger('MeuComponente');
logger.info('Carregando dados para o usuário', { userId });
logger.error('Falha ao carregar dados', { error });
```

## Exemplos em Diferentes Contextos

### Em um Serviço

```typescript
export class NotificationService {
  private logger = getLogger('NotificationService');

  async getNotifications(filters?: NotificationFilters): Promise<Notification[]> {
    try {
      const { data: user, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user?.user) {
        this.logger.warn('Usuário não autenticado para notificações', { error: userError });
        throw new Error('Usuário não autenticado');
      }

      this.logger.info('Buscando notificações', { userId: user.user.id, filters });

      // ... lógica de busca ...

      this.logger.info('Notificações encontradas', { count: data?.length || 0 });
      return data || [];
    } catch (error) {
      this.logger.error('Erro ao buscar notificações', { error });
      throw error;
    }
  }
}
```

### Em um Hook React

```typescript
export function useNotifications(): UseNotificationsReturn {
  const logger = getLogger('useNotifications');
  // ... estado e outras variáveis ...

  const refetch = async () => {
    logger.info('Recarregando notificações');
    setLoading(true);
    try {
      // ... lógica de busca ...
      logger.info('Notificações recarregadas com sucesso', { count: data.length });
    } catch (error) {
      logger.error('Erro ao recarregar notificações', { error });
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // ... resto do hook ...
}
```

### Em uma Função Edge do Supabase

```typescript
serve(async (req) => {
  const logger = getLogger('ProcessImportJob');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();
    
    logger.info('Iniciando processamento de job', { jobId });
    
    // ... lógica de processamento ...
    
    logger.info('Job concluído com sucesso', { jobId, result });

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Erro ao processar job', { error });
    
    // ... lógica de tratamento de erro ...
    
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

## Conclusão

O uso consistente deste sistema de logs em toda a aplicação melhorará significativamente a capacidade de depuração, monitoramento e resolução de problemas. Ele fornece uma base sólida que pode ser estendida no futuro para incluir recursos adicionais, como envio de logs para serviços de monitoramento externos.