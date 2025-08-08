window.supabase = supabase;
// Script de teste para verificar notificações no console do browser
// Cole este código no console do navegador (F12) quando estiver logado

console.log('🔍 Testando sistema de notificações...');

// 1. Verificar se usuário está logado
const checkAuth = async () => {
  try {
    const { supabase } = window;
    if (!supabase) {
      console.error('❌ Supabase client não encontrado');
      return false;
    }
    
    const { data: user, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('❌ Erro de autenticação:', error);
      return false;
    }
    
    if (!user?.user) {
      console.warn('⚠️ Usuário não está logado');
      return false;
    }
    
    console.log('✅ Usuário logado:', user.user.email, 'ID:', user.user.id);
    return user.user;
  } catch (err) {
    console.error('❌ Erro ao verificar autenticação:', err);
    return false;
  }
};

// 2. Testar busca de notificações
const testNotifications = async () => {
  try {
    const user = await checkAuth();
    if (!user) return;
    
    console.log('🔍 Buscando notificações...');
    
    const { supabase } = window;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao buscar notificações:', error);
      
      if (error.code === '42501') {
        console.info('💡 Erro de RLS - Execute o SQL no painel do Supabase');
      } else if (error.code === '42P01') {
        console.info('💡 Tabela não existe - Execute create_notifications_table.sql');
      }
      return;
    }
    
    console.log('✅ Notificações encontradas:', data.length);
    console.table(data);
    
  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
};

// 3. Executar teste
testNotifications();

// 4. Função para inserir notificação de teste
window.insertTestNotification = async () => {
  try {
    const user = await checkAuth();
    if (!user) return;
    
    const { supabase } = window;
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title: 'Teste da Central',
        message: 'Esta é uma notificação de teste criada pelo console.',
        type: 'info',
        category: 'general',
        is_read: false
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar notificação:', error);
    } else {
      console.log('✅ Notificação criada:', data);
    }
  } catch (err) {
    console.error('❌ Erro:', err);
  }
};

console.log('💡 Execute window.insertTestNotification() para criar uma notificação de teste');
