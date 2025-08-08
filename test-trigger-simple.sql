-- Script simplificado para testar o trigger de notificações
-- Resolve problemas de cast de UUID

-- 1. Verificar se as tabelas existem
SELECT 
    'Tabelas encontradas:' as info,
    string_agg(table_name, ', ') as tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('notifications', 'background_jobs');

-- 2. Verificar se há usuários
SELECT 
    'Usuários encontrados:' as info,
    COUNT(*) as count,
    MIN(created_at) as oldest_user,
    MAX(created_at) as newest_user
FROM auth.users;

-- 3. Verificar a estrutura da tabela notifications
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Teste simples do trigger
DO $$
DECLARE
    test_user_id UUID;
    test_job_id UUID;
    notification_exists BOOLEAN := FALSE;
    job_exists BOOLEAN := FALSE;
BEGIN
    -- Obter um usuário existente
    SELECT id INTO test_user_id 
    FROM auth.users 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '❌ Nenhum usuário encontrado - não é possível testar';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Testando com usuário: %', test_user_id;
    
    -- Criar job de teste
    INSERT INTO public.background_jobs (
        type,
        status,
        payload,
        progress,
        user_id
    ) VALUES (
        'transaction_import',
        'pending',
        '{"test": true}'::jsonb,
        0,
        test_user_id
    ) RETURNING id INTO test_job_id;
    
    RAISE NOTICE '✅ Job criado: %', test_job_id;
    
    -- Atualizar para completed (deve disparar trigger)
    UPDATE public.background_jobs
    SET 
        status = 'completed',
        progress = 100,
        completed_at = now(),
        result = '{"imported": 1}'::jsonb
    WHERE id = test_job_id;
    
    RAISE NOTICE '✅ Job atualizado para completed';
    
    -- Aguardar um pouco
    PERFORM pg_sleep(1);
    
    -- Verificar se o job foi atualizado
    SELECT EXISTS(
        SELECT 1 FROM public.background_jobs 
        WHERE id = test_job_id AND status = 'completed'
    ) INTO job_exists;
    
    -- Verificar se a notificação foi criada
    SELECT EXISTS(
        SELECT 1 FROM public.notifications 
        WHERE related_entity_id = test_job_id
        AND related_entity_type = 'background_job'
        AND type = 'success'
    ) INTO notification_exists;
    
    -- Resultados
    IF job_exists THEN
        RAISE NOTICE '✅ Job foi salvo corretamente com status completed';
    ELSE
        RAISE NOTICE '❌ Job não foi encontrado ou não tem status completed';
    END IF;
    
    IF notification_exists THEN
        RAISE NOTICE '✅ SUCCESS: Notificação foi criada pelo trigger!';
    ELSE
        RAISE NOTICE '❌ FAILURE: Trigger não criou notificação';
        
        -- Debug: verificar se existem notificações para este usuário
        DECLARE
            user_notification_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO user_notification_count
            FROM public.notifications 
            WHERE user_id = test_user_id;
            
            RAISE NOTICE 'DEBUG: Usuário tem % notificações no total', user_notification_count;
        END;
    END IF;
    
    -- Mostrar detalhes da notificação se existir
    DECLARE
        notification_record RECORD;
    BEGIN
        SELECT title, message, created_at
        INTO notification_record
        FROM public.notifications 
        WHERE related_entity_id = test_job_id
        LIMIT 1;
        
        IF FOUND THEN
            RAISE NOTICE 'Notificação encontrada: "%" - %', 
                notification_record.title, 
                notification_record.created_at;
        END IF;
    END;
    
    -- Limpeza
    DELETE FROM public.notifications WHERE related_entity_id = test_job_id;
    DELETE FROM public.background_jobs WHERE id = test_job_id;
    
    RAISE NOTICE '✅ Dados de teste removidos';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERRO durante o teste: % - %', SQLSTATE, SQLERRM;
    
    -- Tentar limpar mesmo em caso de erro
    BEGIN
        DELETE FROM public.notifications WHERE related_entity_id = test_job_id;
        DELETE FROM public.background_jobs WHERE id = test_job_id;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore cleanup errors
    END;
END $$;
