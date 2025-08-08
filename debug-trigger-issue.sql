-- Script para investigar por que o trigger não funciona
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se o trigger existe
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'background_jobs'
ORDER BY trigger_name;

-- 2. Verificar se a função do trigger existe
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'create_background_job_notification'
AND routine_schema = 'public';

-- 3. Testar se conseguimos criar notificação manualmente
DO $$
DECLARE
    test_user_id UUID;
    test_job_id UUID;
    notification_inserted BOOLEAN := FALSE;
BEGIN
    -- Obter usuário
    SELECT id INTO test_user_id FROM auth.users ORDER BY created_at DESC LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '❌ Nenhum usuário encontrado';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Testando com usuário: %', test_user_id;
    
    -- Tentar inserir notificação manualmente
    BEGIN
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            category,
            related_entity_type,
            related_entity_id,
            data
        ) VALUES (
            test_user_id,
            'Teste Manual Trigger',
            'Esta é uma notificação de teste manual',
            'success',
            'background_job',
            'background_job',
            gen_random_uuid(), -- Gerar UUID aleatório para teste
            '{"test": true}'::jsonb
        );
        
        notification_inserted := TRUE;
        RAISE NOTICE '✅ Notificação manual inserida com sucesso';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Erro ao inserir notificação manual: % - %', SQLSTATE, SQLERRM;
    END;
    
    -- Se conseguiu inserir, testar o trigger
    IF notification_inserted THEN
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
            '{"test_trigger": true}'::jsonb,
            0,
            test_user_id
        ) RETURNING id INTO test_job_id;
        
        RAISE NOTICE '✅ Job de teste criado: %', test_job_id;
        
        -- Aguardar 1 segundo
        PERFORM pg_sleep(1);
        
        -- Atualizar job para completed (deve disparar trigger)
        UPDATE public.background_jobs 
        SET 
            status = 'completed',
            progress = 100,
            completed_at = now(),
            updated_at = now(),
            result = '{"imported": 1, "test": true}'::jsonb
        WHERE id = test_job_id;
        
        RAISE NOTICE '✅ Job atualizado para completed';
        
        -- Aguardar mais um pouco
        PERFORM pg_sleep(2);
        
        -- Verificar se trigger criou notificação
        DECLARE
            trigger_notification_count INTEGER;
            manual_notification_count INTEGER;
        BEGIN
            -- Contar notificações criadas pelo trigger
            SELECT COUNT(*) INTO trigger_notification_count
            FROM public.notifications 
            WHERE related_entity_id = test_job_id
            AND related_entity_type = 'background_job';
            
            -- Contar todas as notificações de teste
            SELECT COUNT(*) INTO manual_notification_count
            FROM public.notifications 
            WHERE user_id = test_user_id
            AND (title = 'Teste Manual Trigger' OR related_entity_id = test_job_id);
            
            RAISE NOTICE 'Notificações do trigger para job %: %', test_job_id, trigger_notification_count;
            RAISE NOTICE 'Total de notificações de teste: %', manual_notification_count;
            
            IF trigger_notification_count > 0 THEN
                RAISE NOTICE '✅ SUCCESS: Trigger funcionou!';
            ELSE
                RAISE NOTICE '❌ FAILURE: Trigger NÃO funcionou';
                
                -- Debug adicional
                DECLARE
                    job_final_status TEXT;
                    job_progress INTEGER;
                BEGIN
                    SELECT status, progress 
                    INTO job_final_status, job_progress
                    FROM public.background_jobs 
                    WHERE id = test_job_id;
                    
                    RAISE NOTICE 'Status final do job: % (progress: %)', job_final_status, job_progress;
                END;
            END IF;
        END;
        
        -- Limpeza
        DELETE FROM public.notifications WHERE user_id = test_user_id AND title = 'Teste Manual Trigger';
        DELETE FROM public.notifications WHERE related_entity_id = test_job_id;
        DELETE FROM public.background_jobs WHERE id = test_job_id;
        
        RAISE NOTICE '✅ Limpeza concluída';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERRO GERAL: % - %', SQLSTATE, SQLERRM;
END $$;

-- 4. Verificar logs recentes de jobs completed
SELECT 
    id,
    type,
    status,
    progress,
    created_at,
    updated_at,
    completed_at,
    EXTRACT(EPOCH FROM (completed_at - created_at)) as duration_seconds
FROM public.background_jobs 
WHERE status = 'completed'
ORDER BY completed_at DESC 
LIMIT 5;

-- 5. Verificar se há notificações de background_job
SELECT 
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN category = 'background_job' THEN 1 END) as background_job_notifications,
    COUNT(CASE WHEN type = 'success' AND category = 'background_job' THEN 1 END) as success_notifications
FROM public.notifications;
