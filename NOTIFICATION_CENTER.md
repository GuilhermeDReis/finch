# Central de Notificações

## Visão Geral

Foi implementada uma central de notificações completa para o sistema, que permite gerenciar e visualizar todas as notificações do usuário de forma centralizada. A central inclui um ícone de sininho no cabeçalho e está integrada com os jobs em segundo plano (background jobs).

## Funcionalidades Implementadas

### 1. **Banco de Dados**

#### Tabela de Notificações (`notifications`)
- **Campos principais:**
  - `id`: Identificador único
  - `user_id`: Usuário proprietário da notificação
  - `title`: Título da notificação
  - `message`: Mensagem/descrição
  - `type`: Tipo da notificação (`info`, `success`, `warning`, `error`)
  - `category`: Categoria (`general`, `background_job`, `transaction`, `system`)
  - `is_read`: Status de leitura
  - `data`: Dados adicionais em formato JSON
  - `related_entity_type` e `related_entity_id`: Entidade relacionada
  - `created_at`, `read_at`, `expires_at`: Timestamps

#### Funções e Triggers
- **Função `mark_notification_as_read()`**: Marca uma notificação como lida
- **Função `mark_all_notifications_as_read()`**: Marca todas as notificações como lidas
- **Trigger automático**: Cria notificações automaticamente quando jobs em segundo plano são concluídos ou falham
- **Função de limpeza**: Remove notificações antigas automaticamente

### 2. **Serviço de Notificações** (`notificationService.ts`)

#### Principais Métodos:
- `getNotifications()`: Busca notificações com filtros e paginação
- `getNotificationStats()`: Estatísticas de notificações
- `markAsRead()`: Marca notificação como lida
- `markAllAsRead()`: Marca todas como lidas
- `createNotification()`: Cria nova notificação
- `deleteNotification()`: Remove notificação
- `subscribeToNotifications()`: Subscrição em tempo real

#### Recursos:
- **Filtros avançados**: Por categoria, tipo, status de leitura
- **Paginação**: Para grandes volumes de notificações
- **Tempo real**: Atualizações automáticas via Supabase Realtime
- **Estatísticas**: Contadores por categoria e tipo

### 3. **Hook Personalizado** (`useNotifications.ts`)

#### Funcionalidades:
- **Estado reativo**: Gerencia estado das notificações automaticamente
- **Tempo real**: Atualiza interface quando novas notificações chegam
- **Paginação automática**: Load more com scroll infinito
- **Filtros dinâmicos**: Aplicação de filtros em tempo real
- **Cache inteligente**: Otimização de performance

### 4. **Interface de Usuário**

#### Componente Principal (`NotificationCenter.tsx`)
- **Ícone de sino**: Indica presença de notificações não lidas
- **Badge com contador**: Mostra número de notificações não lidas
- **Painel completo**: Interface rica para gestão de notificações

#### Recursos da Interface:
- **Design responsivo**: Adapta-se a diferentes tamanhos de tela
- **Filtros visuais**: Dropdowns para categoria e tipo
- **Ações em massa**: Marcar todas como lidas, deletar lidas
- **Indicadores visuais**: Cores e ícones por tipo de notificação
- **Timestamps relativos**: "há 5 minutos", "há 2 horas"
- **Scroll infinito**: Carrega mais notificações automaticamente

### 5. **Integração com Background Jobs**

#### Notificações Automáticas:
- **Importação concluída**: Notificação de sucesso quando transações são importadas
- **Importação falhou**: Notificação de erro com detalhes do problema
- **Categorização concluída**: Notificação quando categorização automática termina
- **Categorização falhou**: Notificação de erro na categorização

#### Dados Contextuais:
- **Tipo de job**: Importação ou categorização
- **Status**: Sucesso ou erro
- **Progresso**: Percentual de conclusão
- **Timestamps**: Quando iniciou e terminou
- **Mensagens de erro**: Detalhes técnicos quando aplicável

## Arquivos Criados/Modificados

### Novos Arquivos:
1. **`supabase/migrations/20250807000000_create_notifications.sql`** - Migração da tabela
2. **`src/services/notificationService.ts`** - Serviço de notificações
3. **`src/hooks/useNotifications.ts`** - Hook personalizado
4. **`src/components/NotificationCenter.tsx`** - Componente principal
5. **`src/components/NotificationCenterDemo.tsx`** - Versão de demonstração

### Arquivos Modificados:
1. **`src/integrations/supabase/types.ts`** - Tipos da tabela de notificações
2. **`src/components/Layout.tsx`** - Inclusão da central no header

## Como Usar

### 1. **Executar Migração:**
```bash
npx supabase migration up
```

### 2. **Visualizar Notificações:**
- Clique no ícone de sino no header
- Veja o badge com contador de não lidas
- Use os filtros para organizar as notificações

### 3. **Gerenciar Notificações:**
- **Marcar como lida**: Botão de check em cada notificação
- **Deletar**: Botão X em cada notificação
- **Ações em massa**: Menu dropdown no header do painel

### 4. **Filtros Disponíveis:**
- **Por categoria**: Processamento, Transação, Sistema, Geral
- **Por tipo**: Sucesso, Erro, Aviso, Info
- **Por status**: Mostrar apenas não lidas

## Demo Disponível

Para demonstração sem banco de dados, use o componente `NotificationCenterDemo` que já está configurado no layout atual. Ele inclui:
- 5 notificações de exemplo
- Diferentes tipos e categorias
- Funcionalidades completas (exceto persistência)
- Timestamps relativos em português

## Próximos Passos

1. **Executar migração no ambiente de produção**
2. **Configurar triggers para outros eventos do sistema**
3. **Adicionar notificações push/email (opcional)**
4. **Implementar sistema de templates para notificações**
5. **Adicionar analytics de engajamento com notificações**

## Benefícios

- **Experiência unificada**: Todas as notificações em um só lugar
- **Feedback imediato**: Jobs em segundo plano geram notificações automáticas
- **Interface intuitiva**: Fácil de usar e entender
- **Performance otimizada**: Paginação e cache inteligente
- **Tempo real**: Atualizações instantâneas
- **Flexibilidade**: Sistema extensível para novos tipos de notificação

A implementação fornece uma base sólida para um sistema de notificações escalável e user-friendly!
