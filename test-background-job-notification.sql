-- Script para testar o trigger de notificações de background jobs
-- Execute este script no SQL Editor do Supabase para diagnosticar o problema

-- 1. Verificar se as tabelas necessárias existem
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('notifications', 'background_jobs')
ORDER BY table_name;

-- 2. Verificar se o trigger existe
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_background_job_notification';

-- 3. Verificar se há usuários na tabela auth.users
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 3;

-- 4. Inserir um job de teste e marcar como completado para testar o trigger
DO $$
DECLARE
    user_uuid UUID;
    job_uuid UUID;
BEGIN
    -- Pegar o ID do primeiro usuário
    SELECT id INTO user_uuid FROM auth.users ORDER BY created_at DESC LIMIT 1;
    
    -- Verificar se encontrou um usuário
    IF user_uuid IS NOT NULL THEN
        -- Inserir um job de teste
        INSERT INTO public.background_jobs (
            type, 
            status, 
            payload, 
            progress, 
            user_id
        ) VALUES (
            'transaction_import',
            'pending',
            '{"test": true, "transactions": [], "layoutType": "bank"}',
            0,
            user_uuid
        ) RETURNING id INTO job_uuid;
        
        RAISE NOTICE 'Job de teste criado com ID: %', job_uuid;
        
        -- Aguardar um momento
        PERFORM pg_sleep(1);
        
        -- Atualizar o job para processando
        UPDATE public.background_jobs 
        SET status = 'processing', progress = 50, updated_at = now()
        WHERE id = job_uuid;
        
        -- Aguardar um momento
        PERFORM pg_sleep(1);
        
        -- Atualizar o job para concluído (isso deve disparar o trigger)
        UPDATE public.background_jobs 
        SET 
            status = 'completed', 
            progress = 100, 
            completed_at = now(),
            updated_at = now(),
            result = '{"imported": 5, "skipped": 0, "errors": []}'
        WHERE id = job_uuid;
        
        RAISE NOTICE 'Job atualizado para completed - trigger deve ter disparado';
        
        -- Verificar se a notificação foi criada
        PERFORM pg_sleep(2);
        
        IF EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE related_entity_id = job_uuid 
            AND related_entity_type = 'background_job'
        ) THEN
            RAISE NOTICE '✅ SUCCESS: Notificação foi criada automaticamente pelo trigger!';
        ELSE
            RAISE NOTICE '❌ FAILURE: Nenhuma notificação foi criada pelo trigger';
        END IF;
        
    ELSE
        RAISE NOTICE 'Nenhum usuário encontrado na tabela auth.users';
    END IF;
END $$;

-- 5. Verificar as notificações criadas recentemente
SELECT 
    n.id,
    n.title,
    n.message,
    n.type,
    n.category,
    n.related_entity_type,
    n.related_entity_id,
    n.created_at,
    extract(epoch from (now() - n.created_at))/60 as minutes_ago,
    u.email as user_email
FROM public.notifications n
JOIN auth.users u ON n.user_id = u.id
WHERE n.created_at > (now() - INTERVAL '1 hour')
ORDER BY n.created_at DESC
LIMIT 5;

-- 6. Verificar jobs de teste recentes
SELECT 
    id,
    type,
    status,
    progress,
    created_at,
    updated_at,
    completed_at,
    extract(epoch from (now() - created_at))/60 as minutes_ago
FROM public.background_jobs
WHERE created_at > (now() - INTERVAL '1 hour')
ORDER BY created_at DESC
LIMIT 5;

-- 7. Limpar jobs de teste (opcional)
-- DELETE FROM public.background_jobs 
-- WHERE payload::text LIKE '%"test": true%'
-- AND created_at > (now() - INTERVAL '1 hour');
