// Script de debug completo para notificações
// Cole este código no console do navegador (F12)

console.log('🔍 Debug do Sistema de Notificações');
console.log('=====================================');

// Função para obter o cliente supabase
const getSupabase = () => {
  // Tenta diferentes formas de acessar o supabase
  if (typeof window !== 'undefined') {
    if (window.supabase) return window.supabase;
    if (window.__supabase) return window.__supabase;
  }
  
  // Se não encontrar, pode ser que esteja importado no módulo
  console.error('❌ Cliente Supabase não encontrado no window object');
  return null;
};

// Função principal de debug
const debugNotifications = async () => {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('❌ Não foi possível encontrar o cliente Supabase');
    return;
  }

  console.log('✅ Cliente Supabase encontrado');

  try {
    // 1. Verificar autenticação
    console.log('\n1️⃣ Verificando autenticação...');
    const { data: user, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Erro de autenticação:', userError);
      return;
    }
    
    if (!user?.user) {
      console.warn('⚠️ Usuário não está autenticado');
      return;
    }
    
    console.log('✅ Usuário autenticado:', {
      id: user.user.id,
      email: user.user.email
    });

    // 2. Verificar se a tabela existe
    console.log('\n2️⃣ Verificando tabela de notificações...');
    const { data: tables, error: tablesError } = await supabase
      .from('notifications')
      .select('id')
      .limit(1);
    
    if (tablesError) {
      console.error('❌ Erro ao acessar tabela:', tablesError);
      if (tablesError.code === '42P01') {
        console.info('💡 Tabela não existe. Execute create_notifications_table.sql');
      } else if (tablesError.code === '42501') {
        console.info('💡 Erro de RLS. Verifique as políticas de segurança');
      }
      return;
    }
    
    console.log('✅ Tabela de notificações acessível');

    // 3. Buscar notificações do usuário
    console.log('\n3️⃣ Buscando notificações do usuário...');
    const { data: notifications, error: notError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false });
    
    if (notError) {
      console.error('❌ Erro ao buscar notificações:', notError);
      return;
    }
    
    console.log(`✅ ${notifications.length} notificações encontradas:`);
    console.table(notifications);

    // 4. Criar notificação de teste se não houver nenhuma
    if (notifications.length === 0) {
      console.log('\n4️⃣ Criando notificação de teste...');
      const { data: newNotification, error: insertError } = await supabase
        .from('notifications')
        .insert({
          user_id: user.user.id,
          title: '🧪 Teste do Console',
          message: 'Esta notificação foi criada pelo script de debug. Sistema funcionando!',
          type: 'success',
          category: 'general',
          is_read: false
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ Erro ao criar notificação:', insertError);
      } else {
        console.log('✅ Notificação de teste criada:', newNotification);
        console.log('🔄 Recarregue a página para ver a notificação na central');
      }
    }

    // 5. Estatísticas
    console.log('\n5️⃣ Estatísticas:');
    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.is_read).length,
      byType: {},
      byCategory: {}
    };
    
    notifications.forEach(n => {
      stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
      stats.byCategory[n.category] = (stats.byCategory[n.category] || 0) + 1;
    });
    
    console.table(stats);

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
};

// Executar debug
debugNotifications();

// Função global para criar notificação
window.createTestNotification = async () => {
  const supabase = getSupabase();
  if (!supabase) return;
  
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) {
    console.error('❌ Usuário não autenticado');
    return;
  }
  
  const titles = [
    'Nova Transação',
    'Importação Concluída', 
    'Limite do Cartão',
    'Pagamento Processado',
    'Categorização Automática'
  ];
  
  const messages = [
    'Transação de R$ -45,80 foi registrada.',
    'Importação de 23 transações concluída com sucesso.',
    'Você atingiu 70% do limite do cartão.',
    'Pagamento de R$ 1.200,00 foi processado.',
    '15 transações foram categorizadas automaticamente.'
  ];
  
  const types = ['info', 'success', 'warning', 'success', 'info'];
  const categories = ['transaction', 'background_job', 'system', 'transaction', 'background_job'];
  
  const index = Math.floor(Math.random() * titles.length);
  
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: user.user.id,
      title: titles[index],
      message: messages[index],
      type: types[index],
      category: categories[index],
      is_read: false
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Erro ao criar:', error);
  } else {
    console.log('✅ Notificação criada:', data);
    console.log('🔄 Clique em "Atualizar" na central para ver');
  }
};

console.log('\n💡 Comandos disponíveis:');
console.log('- window.createTestNotification() - Cria notificação aleatória');
console.log('- debugNotifications() - Executa debug completo novamente');
