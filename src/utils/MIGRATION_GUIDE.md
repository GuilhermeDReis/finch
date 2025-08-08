# Guia de Migração para o Logger Estruturado

Este guia fornece instruções passo a passo para migrar do uso direto de `console.log` para o novo sistema de logs estruturados.

## Índice

1. [Por que migrar?](#por-que-migrar)
2. [Visão geral do processo](#visão-geral-do-processo)
3. [Passo a passo da migração](#passo-a-passo-da-migração)
4. [Exemplos de migração](#exemplos-de-migração)
5. [Melhores práticas](#melhores-práticas)
6. [Checklist de migração](#checklist-de-migração)

## Por que migrar?

A migração para o novo sistema de logs estruturados oferece várias vantagens:

- **Logs consistentes**: Formato padronizado em toda a aplicação
- **Contexto enriquecido**: Metadados estruturados para facilitar a depuração
- **Filtragem por nível**: Controle granular sobre quais logs são exibidos
- **Melhor depuração**: Identificação clara da origem dos logs (módulo/componente)
- **Preparação para produção**: Facilidade para integrar com sistemas de monitoramento

## Visão geral do processo

O processo de migração envolve:

1. Identificar arquivos que usam `console.log`, `console.warn` e `console.error`
2. Importar e inicializar o logger em cada arquivo
3. Substituir chamadas de console pelo método de logger apropriado
4. Adicionar contexto estruturado aos logs
5. Testar para garantir que os logs funcionam conforme esperado

## Passo a passo da migração

### 1. Identificar arquivos para migração

Use o script `cleanup-logs.sh` como referência para identificar arquivos que contêm muitas chamadas de console:

```bash
grep -r "console\.log\|console\.warn\|console\.error" --include="*.ts" --include="*.tsx" src/
```

### 2. Importar e inicializar o logger

No topo de cada arquivo, adicione:

```typescript
import { getLogger } from '@/utils/logger';

// Criar uma instância do logger com um nome significativo
const logger = getLogger('NomeDoComponenteOuServiço');
```

### 3. Substituir chamadas de console

Substitua as chamadas de console existentes pelos métodos equivalentes do logger:

| Console original | Logger equivalente |
|-----------------|--------------------|
| `console.log()` | `logger.info()` ou `logger.debug()` |
| `console.warn()` | `logger.warn()` |
| `console.error()` | `logger.error()` |

### 4. Adicionar contexto estruturado

Aproveite o formato estruturado para adicionar contexto útil:

```typescript
// Antes
console.log('Usuário logado', user.id);

// Depois
logger.info('Usuário logado', { userId: user.id, email: user.email });
```

### 5. Escolher o nível de log apropriado

Use o nível de log mais adequado para cada mensagem:

- **debug**: Informações detalhadas úteis durante o desenvolvimento
- **info**: Informações gerais sobre o fluxo da aplicação
- **warn**: Situações potencialmente problemáticas
- **error**: Erros que afetam a funcionalidade

## Exemplos de migração

### Exemplo 1: Componente React

**Antes:**

```typescript
const NotificationCenter = () => {
  useEffect(() => {
    console.log('Carregando notificações...');
    fetchNotifications().catch(err => {
      console.error('Erro ao carregar notificações:', err);
    });
  }, []);
  
  // ...
}
```

**Depois:**

```typescript
import { getLogger } from '@/utils/logger';

const logger = getLogger('NotificationCenter');

const NotificationCenter = () => {
  useEffect(() => {
    logger.info('Carregando notificações');
    fetchNotifications().catch(err => {
      logger.error('Erro ao carregar notificações', { error: err });
    });
  }, []);
  
  // ...
}
```

### Exemplo 2: Serviço

**Antes:**

```typescript
async function processImportJob(jobId) {
  console.log('Iniciando processamento do job:', jobId);
  try {
    const job = await getJobDetails(jobId);
    if (!job) {
      console.warn('Job não encontrado:', jobId);
      return null;
    }
    
    // Processamento...
    console.log('Job processado com sucesso:', jobId);
    return result;
  } catch (error) {
    console.error('Erro ao processar job:', jobId, error);
    throw error;
  }
}
```

**Depois:**

```typescript
import { getLogger } from '@/utils/logger';

const logger = getLogger('ImportJobService');

async function processImportJob(jobId) {
  logger.info('Iniciando processamento do job', { jobId });
  try {
    const job = await getJobDetails(jobId);
    if (!job) {
      logger.warn('Job não encontrado', { jobId });
      return null;
    }
    
    // Processamento...
    logger.info('Job processado com sucesso', { jobId, recordCount: result.records.length });
    return result;
  } catch (error) {
    logger.error('Erro ao processar job', { jobId, error });
    throw error;
  }
}
```

### Exemplo 3: Função Edge do Supabase

**Antes:**

```typescript
serve(async (req) => {
  try {
    const { jobId } = await req.json();
    console.log('Requisição recebida para processar job:', jobId);
    
    // Processamento...
    
    console.log('Resposta enviada para job:', jobId);
    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    console.error('Erro na função edge:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 });
  }
});
```

**Depois:**

```typescript
import { getLogger } from '../../../src/utils/logger';

const logger = getLogger('ProcessJobFunction');

serve(async (req) => {
  try {
    const { jobId } = await req.json();
    logger.info('Requisição recebida para processar job', { jobId });
    
    // Processamento...
    
    logger.info('Resposta enviada para job', { jobId, status: 'success' });
    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    logger.error('Erro na função edge', { error });
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 });
  }
});
```

## Melhores práticas

1. **Nomeie loggers de forma significativa**: Use nomes que identifiquem claramente a origem dos logs
2. **Seja consistente com os níveis**: Use o mesmo nível para eventos similares em toda a aplicação
3. **Estruture os metadados**: Use objetos para passar contexto estruturado em vez de concatenar strings
4. **Evite logs excessivos**: Não logue informações sensíveis ou volumes muito grandes de dados
5. **Use debug para desenvolvimento**: Reserve o nível `debug` para informações úteis apenas durante o desenvolvimento
6. **Capture exceções com contexto**: Sempre inclua o objeto de erro completo nos logs de erro

## Checklist de migração

Use esta checklist para cada arquivo que você migrar:

- [ ] Importar o módulo logger
- [ ] Inicializar o logger com um nome significativo
- [ ] Substituir todas as chamadas `console.log` por `logger.info` ou `logger.debug`
- [ ] Substituir todas as chamadas `console.warn` por `logger.warn`
- [ ] Substituir todas as chamadas `console.error` por `logger.error`
- [ ] Adicionar contexto estruturado a cada log
- [ ] Verificar se todos os logs têm o nível apropriado
- [ ] Testar para garantir que os logs aparecem conforme esperado

---

Para mais informações, consulte a documentação completa em [LOGGER.md](./LOGGER.md).