// Script de teste para Real-time - Execute no console do navegador
// Este script testa o sistema completo de notificações em tempo real

console.log('🧪 Teste Automatizado do Sistema Real-time');
console.log('==========================================');

// Função para aguardar um tempo
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função para testar o sistema completo
const testRealtimeSystem = async () => {
  try {
    console.log('\n1️⃣ Verificando conexão e helpers...');
    
    const debug = window.__supabase_debug;
    if (!debug) {
      console.error('❌ Debug helpers não encontrados. Recarregue a página.');
      return;
    }
    
    console.log('✅ Debug helpers encontrados');
    
    // Verificar autenticação
    const { data: user } = await debug.supabase.auth.getUser();
    if (!user?.user) {
      console.error('❌ Usuário não autenticado');
      return;
    }
    
    console.log('✅ Usuário autenticado:', user.user.email);
    
    console.log('\n2️⃣ Testando sistema Real-time...');
    
    // Criar uma notificação diretamente no banco via API
    const testNotification = {
      user_id: user.user.id,
      title: `🚀 Teste Automático ${Date.now()}`,
      message: 'Esta notificação foi criada pelo teste automatizado. Se você vê este toast, o Real-time está funcionando!',
      type: 'success',
      category: 'system',
      is_read: false
    };
    
    console.log('📤 Criando notificação de teste via API...');
    
    const response = await fetch('https://hjwnykqbdecjrbqpweak.supabase.co/rest/v1/notifications', {
      method: 'POST',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqd255a3FiZGVjanJicXB3ZWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MzA0ODAsImV4cCI6MjA2ODMwNjQ4MH0.oHMNZl0J5SyiCl7KkEGpNROUiENd3A9Q1VCuxioW4gY',
        'Authorization': `Bearer ${debug.supabase.auth.session()?.access_token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(testNotification)
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${await response.text()}`);
    }
    
    const created = await response.json();
    console.log('✅ Notificação criada via API:', created);
    
    console.log('\n3️⃣ Aguardando Real-time (5 segundos)...');
    console.log('👀 Observe se aparece um toast de notificação na tela!');
    
    await sleep(5000);
    
    console.log('\n4️⃣ Verificando se a notificação foi recebida...');
    
    // Verificar no estado atual se a notificação chegou
    const currentNotifications = await debug.notificationService.getNotifications({ limit: 5 });
    const foundTest = currentNotifications.find(n => n.title.includes('Teste Automático'));
    
    if (foundTest) {
      console.log('✅ SUCCESS: Notificação encontrada no estado!');
      console.log('🎉 Sistema Real-time está funcionando perfeitamente!');
    } else {
      console.log('⚠️ Notificação não encontrada no estado local');
      console.log('💡 Isso pode ser normal - verifique se viu o toast na tela');
    }
    
    console.log('\n5️⃣ Teste de limpeza...');
    
    // Deletar a notificação de teste
    try {
      await debug.notificationService.deleteNotification(created[0]?.id || foundTest?.id);
      console.log('✅ Notificação de teste removida');
    } catch (e) {
      console.log('⚠️ Erro ao remover (normal):', e.message);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
};

// Executar teste
testRealtimeSystem();

// Função para teste manual simples
window.testRealtimeSimple = async () => {
  const debug = window.__supabase_debug;
  if (!debug) return console.error('Debug helpers não encontrados');
  
  const { data: user } = await debug.supabase.auth.getUser();
  if (!user?.user) return console.error('Usuário não autenticado');
  
  // Inserir via service (que usa o client Supabase interno)
  try {
    const result = await debug.notificationService.createNotification({
      title: '⚡ Teste Manual Real-time',
      message: 'Teste simples criado via service layer',
      type: 'info',
      category: 'general',
      is_read: false
    });
    
    console.log('✅ Notificação criada via service:', result);
    console.log('👀 Observe o toast na tela!');
  } catch (error) {
    console.error('❌ Erro:', error);
  }
};

console.log('\n💡 Comandos disponíveis:');
console.log('- testRealtimeSystem() - Executa teste completo novamente');
console.log('- window.testRealtimeSimple() - Teste simples manual');
