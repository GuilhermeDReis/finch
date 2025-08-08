-- Script para ativar Real-time no Supabase para notificações
-- Execute este script no SQL Editor do Supabase

-- 1. Habilitar Real-time na tabela de notificações
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 2. Verificar se foi adicionada corretamente
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'notifications';

-- 3. Criar uma função para testar se Real-time está funcionando
CREATE OR REPLACE FUNCTION test_realtime_notification()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Inserir uma notificação de teste
    INSERT INTO public.notifications (
        user_id, 
        title, 
        message, 
        type, 
        category, 
        is_read, 
        created_at
    ) VALUES (
        (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1),
        '🔔 Real-time Test',
        'Esta notificação foi criada para testar o sistema em tempo real!',
        'success',
        'system',
        false,
        now()
    );
    
    -- Log para confirmar
    RAISE NOTICE 'Notificação de teste Real-time criada!';
END;
$$;

-- 4. Mostrar instruções de uso
SELECT 'Real-time habilitado! Agora você pode:' as instrucoes
UNION ALL
SELECT '1. Execute: SELECT test_realtime_notification(); para testar'
UNION ALL
SELECT '2. Ou insira manualmente: INSERT INTO notifications ...'
UNION ALL
SELECT '3. As notificações aparecerão automaticamente no frontend!';
