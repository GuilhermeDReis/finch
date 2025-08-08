// Script de debug para React/Vite
// Cole este código no console do navegador (F12)

console.log('🔍 Debug do Sistema de Notificações (React)');
console.log('===========================================');

// Função para obter o supabase através dos módulos React
const getSupabaseFromReact = () => {
  try {
    // Tenta acessar através do React DevTools ou contexto
    const reactFiber = document.querySelector('#root')?._reactInternalFiber ||
                      document.querySelector('#root')?._reactInternals;
    
    if (!reactFiber) {
      console.log('⚠️ React Fiber não encontrado, usando fetch direto');
      return null;
    }
    
    console.log('✅ Encontrado React context');
    return null; // Por enquanto, vamos usar fetch direto
  } catch (e) {
    console.warn('⚠️ Erro ao acessar React:', e);
    return null;
  }
};

// Função para fazer requests diretos à API do Supabase
const supabaseRequest = async (path, options = {}) => {
  const SUPABASE_URL = "https://hjwnykqbdecjrbqpweak.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqd255a3FiZGVjanJicXB3ZWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MzA0ODAsImV4cCI6MjA2ODMwNjQ4MH0.oHMNZl0J5SyiCl7KkEGpNROUiENd3A9Q1VCuxioW4gY";
  
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${response.status}: ${error}`);
  }
  
  return response.json();
};

// Função para obter o token de autenticação atual
const getAuthToken = () => {
  try {
    // Tenta obter do localStorage do Supabase
    const supabaseAuth = localStorage.getItem('sb-hjwnykqbdecjrbqpweak-auth-token');
    if (supabaseAuth) {
      const authData = JSON.parse(supabaseAuth);
      return authData.access_token;
    }
    
    // Tenta outras chaves possíveis
    const keys = Object.keys(localStorage).filter(key => 
      key.includes('supabase') && key.includes('auth')
    );
    
    for (const key of keys) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data.access_token) {
          console.log('✅ Token encontrado em:', key);
          return data.access_token;
        }
      } catch (e) {
        continue;
      }
    }
    
    console.warn('⚠️ Token de autenticação não encontrado no localStorage');
    return null;
  } catch (e) {
    console.error('❌ Erro ao buscar token:', e);
    return null;
  }
};

// Função para obter informações do usuário atual
const getCurrentUser = async () => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Token de autenticação não encontrado');
  }
  
  const response = await fetch('https://hjwnykqbdecjrbqpweak.supabase.co/auth/v1/user', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqd255a3FiZGVjanJicXB3ZWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MzA0ODAsImV4cCI6MjA2ODMwNjQ4MH0.oHMNZl0J5SyiCl7KkEGpNROUiENd3A9Q1VCuxioW4gY'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Erro de autenticação: ${response.status}`);
  }
  
  return response.json();
};

// Função principal de debug
const debugNotifications = async () => {
  try {
    console.log('\n1️⃣ Verificando autenticação...');
    
    // Verificar token no localStorage
    const token = getAuthToken();
    if (!token) {
      console.error('❌ Token de autenticação não encontrado');
      console.info('💡 Certifique-se de estar logado no sistema');
      return;
    }
    
    console.log('✅ Token de autenticação encontrado');
    
    // Obter dados do usuário
    const user = await getCurrentUser();
    console.log('✅ Usuário autenticado:', {
      id: user.id,
      email: user.email
    });
    
    console.log('\n2️⃣ Buscando notificações...');
    
    // Buscar notificações
    const notifications = await supabaseRequest(
      `/rest/v1/notifications?user_id=eq.${user.id}&order=created_at.desc`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      }
    );
    
    console.log(`✅ ${notifications.length} notificações encontradas:`);
    console.table(notifications);
    
    // Estatísticas
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
    
    console.log('\n3️⃣ Estatísticas:');
    console.table(stats);
    
    // Se não há notificações, criar uma de teste
    if (notifications.length === 0) {
      console.log('\n4️⃣ Criando notificação de teste...');
      
      const newNotification = await supabaseRequest(
        '/rest/v1/notifications',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Prefer': 'return=representation'
          },
          body: {
            user_id: user.id,
            title: '🧪 Debug Test',
            message: 'Notificação criada pelo script de debug. Sistema funcionando!',
            type: 'success',
            category: 'general',
            is_read: false
          }
        }
      );
      
      console.log('✅ Notificação criada:', newNotification);
      console.log('🔄 Clique no botão "Atualizar" na central para ver');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
    
    if (error.message.includes('401')) {
      console.info('💡 Erro de autenticação - faça login novamente');
    } else if (error.message.includes('42501')) {
      console.info('💡 Erro de RLS - execute os scripts de configuração');
    } else if (error.message.includes('42P01')) {
      console.info('💡 Tabela não existe - execute create_notifications_table.sql');
    }
  }
};

// Função para criar notificação de teste
window.createTestNotification = async () => {
  try {
    const token = getAuthToken();
    const user = await getCurrentUser();
    
    const titles = ['Nova Transação', 'Importação Concluída', 'Limite do Cartão'];
    const messages = [
      'Transação de R$ -45,80 foi registrada.',
      'Importação de 23 transações concluída.',
      'Você atingiu 70% do limite.'
    ];
    const types = ['info', 'success', 'warning'];
    const categories = ['transaction', 'background_job', 'system'];
    
    const index = Math.floor(Math.random() * titles.length);
    
    const newNotification = await supabaseRequest(
      '/rest/v1/notifications',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Prefer': 'return=representation'
        },
        body: {
          user_id: user.id,
          title: titles[index],
          message: messages[index],
          type: types[index],
          category: categories[index],
          is_read: false
        }
      }
    );
    
    console.log('✅ Nova notificação:', newNotification);
    console.log('🔄 Clique em "Atualizar" na central');
    
  } catch (error) {
    console.error('❌ Erro ao criar:', error);
  }
};

// Executar debug
debugNotifications();

console.log('\n💡 Comandos disponíveis:');
console.log('- window.createTestNotification() - Cria notificação aleatória');
console.log('- debugNotifications() - Executa debug novamente');
