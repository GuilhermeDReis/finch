// Diagnóstico completo do sistema de notificações
// Cole este script no console do navegador

console.log('🔍 DIAGNÓSTICO COMPLETO DO SISTEMA');
console.log('==================================');

const diagnose = async () => {
  try {
    const debug = window.__supabase_debug;
    if (!debug) {
      console.error('❌ Debug helpers não disponíveis. Recarregue a página.');
      return;
    }

    console.log('\n1️⃣ VERIFICANDO AUTENTICAÇÃO');
    console.log('---------------------------');
    
    const { data: user, error: userError } = await debug.supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Erro de autenticação:', userError);
      return;
    }
    
    if (!user?.user) {
      console.error('❌ Usuário não está logado');
      return;
    }
    
    console.log('✅ Usuário logado:', {
      id: user.user.id,
      email: user.user.email,
      created_at: user.user.created_at
    });

    console.log('\n2️⃣ TESTANDO BUSCA DIRETA NO BANCO');
    console.log('----------------------------------');
    
    // Busca direta usando o client Supabase
    const { data: directNotifications, error: directError } = await debug.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false });
    
    if (directError) {
      console.error('❌ Erro na busca direta:', directError);
      
      if (directError.code === '42501') {
        console.info('💡 Erro RLS - políticas de segurança bloqueando acesso');
      } else if (directError.code === '42P01') {
        console.info('💡 Tabela não existe');
      }
      return;
    }
    
    console.log(`✅ Busca direta encontrou ${directNotifications.length} notificações:`);
    console.table(directNotifications);

    console.log('\n3️⃣ TESTANDO VIA NOTIFICATION SERVICE');
    console.log('------------------------------------');
    
    try {
      const serviceNotifications = await debug.notificationService.getNotifications({ limit: 20 });
      console.log(`✅ Service encontrou ${serviceNotifications.length} notificações:`);
      console.table(serviceNotifications);
    } catch (serviceError) {
      console.error('❌ Erro no notification service:', serviceError);
    }

    console.log('\n4️⃣ VERIFICANDO RLS POLICIES');
    console.log('---------------------------');
    
    // Verificar políticas RLS
    const { data: policies, error: policiesError } = await debug.supabase.rpc('get_user_permissions', {});
    
    if (policiesError) {
      console.warn('⚠️ Não foi possível verificar políticas RLS:', policiesError);
    } else {
      console.log('✅ Políticas RLS:', policies);
    }

    console.log('\n5️⃣ TESTANDO INSERÇÃO DIRETA');
    console.log('-----------------------------');
    
    const testNotification = {
      user_id: user.user.id,
      title: `🧪 Teste Direto ${new Date().toLocaleTimeString()}`,
      message: 'Notificação criada pelo diagnóstico para testar inserção direta',
      type: 'info',
      category: 'system',
      is_read: false
    };
    
    console.log('📤 Criando notificação de teste...');
    
    const { data: insertResult, error: insertError } = await debug.supabase
      .from('notifications')
      .insert(testNotification)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Erro na inserção:', insertError);
    } else {
      console.log('✅ Notificação inserida:', insertResult);
      
      // Aguardar um pouco e verificar se chegou via real-time
      console.log('⏳ Aguardando 3 segundos para verificar real-time...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verificar se apareceu no estado do componente
      console.log('🔍 Verificando se chegou via real-time...');
    }

    console.log('\n6️⃣ TESTANDO ACESSO À API REST DIRETAMENTE');
    console.log('------------------------------------------');
    
    // Obter token atual
    const session = await debug.supabase.auth.getSession();
    const token = session.data.session?.access_token;
    
    if (!token) {
      console.error('❌ Token de acesso não encontrado');
      return;
    }
    
    console.log('✅ Token obtido:', token.substring(0, 20) + '...');
    
    // Fazer requisição REST direta
    const restResponse = await fetch(`https://hjwnykqbdecjrbqpweak.supabase.co/rest/v1/notifications?user_id=eq.${user.user.id}&order=created_at.desc`, {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqd255a3FiZGVjanJicXB3ZWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MzA0ODAsImV4cCI6MjA2ODMwNjQ4MH0.oHMNZl0J5SyiCl7KkEGpNROUiENd3A9Q1VCuxioW4gY',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!restResponse.ok) {
      const errorText = await restResponse.text();
      console.error('❌ Erro REST API:', restResponse.status, errorText);
    } else {
      const restData = await restResponse.json();
      console.log(`✅ API REST retornou ${restData.length} notificações:`);
      console.table(restData);
    }

    console.log('\n7️⃣ VERIFICANDO REAL-TIME SUBSCRIPTION');
    console.log('-------------------------------------');
    
    // Verificar status da subscription
    const channels = debug.supabase.getChannels();
    console.log('📡 Canais ativos:', channels.length);
    
    channels.forEach((channel, index) => {
      console.log(`📺 Canal ${index + 1}:`, {
        topic: channel.topic,
        state: channel.state,
        joinedAt: channel.joinedAt
      });
    });

    console.log('\n🎯 RESUMO DO DIAGNÓSTICO');
    console.log('========================');
    console.log('✅ Sistema configurado e executando diagnóstico');
    console.log('📊 Verifique os resultados acima para identificar o problema');
    
  } catch (error) {
    console.error('❌ Erro durante diagnóstico:', error);
  }
};

// Função para testar Real-time isoladamente
window.testRealtimeIsolated = async () => {
  const debug = window.__supabase_debug;
  if (!debug) {
    console.error('❌ Debug helpers não disponíveis');
    return;
  }

  const { data: user } = await debug.supabase.auth.getUser();
  if (!user?.user) {
    console.error('❌ Usuário não logado');
    return;
  }

  console.log('🧪 Teste Real-time Isolado');
  console.log('==========================');

  // Criar subscription específica para teste
  const testChannel = debug.supabase
    .channel('test-notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public', 
      table: 'notifications',
      filter: `user_id=eq.${user.user.id}`
    }, (payload) => {
      console.log('🔔 REAL-TIME FUNCIONOU!', payload);
      console.log('🎉 Notificação recebida:', payload.new);
    })
    .subscribe((status) => {
      console.log('📡 Status da subscription:', status);
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscription ativa! Agora insira uma notificação no SQL Editor:');
        console.log(`
INSERT INTO public.notifications (user_id, title, message, type, category, is_read) 
VALUES ('${user.user.id}', 'Teste Real-time', 'Testando...', 'info', 'general', false);
        `);
      }
    });

  // Guardar referência para cleanup
  window.__testChannel = testChannel;
  
  console.log('⏳ Subscription de teste criada. Execute o SQL acima.');
};

// Executar diagnóstico
diagnose();
