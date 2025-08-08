-- Script para diagnosticar problemas com as tabelas
-- Execute este script linha por linha no SQL Editor

-- 1. Verificar se as tabelas existem
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('notifications', 'background_jobs')
ORDER BY table_name;

-- 2. Se as tabelas existem, verificar estrutura da tabela notifications
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'notifications'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Se as tabelas existem, verificar estrutura da tabela background_jobs
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'background_jobs'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Verificar se há usuários para testar
SELECT 
    COUNT(*) as user_count,
    MIN(created_at) as first_user,
    MAX(created_at) as latest_user
FROM auth.users;

-- 5. Verificar se o trigger existe
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%background_job%';

-- 6. Se tudo estiver OK até aqui, teste MÍNIMO do trigger
DO $$
DECLARE
    test_user_id UUID;
    test_job_id UUID;
    notifications_table_exists BOOLEAN;
    background_jobs_table_exists BOOLEAN;
BEGIN
    -- Verificar se as tabelas existem
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'notifications' AND table_schema = 'public'
    ) INTO notifications_table_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'background_jobs' AND table_schema = 'public'
    ) INTO background_jobs_table_exists;
    
    IF NOT notifications_table_exists THEN
        RAISE NOTICE '❌ Tabela notifications não existe!';
        RETURN;
    END IF;
    
    IF NOT background_jobs_table_exists THEN
        RAISE NOTICE '❌ Tabela background_jobs não existe!';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Ambas as tabelas existem';
    
    -- Obter um usuário
    SELECT id INTO test_user_id FROM auth.users ORDER BY created_at DESC LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '❌ Nenhum usuário encontrado';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Usuário de teste: %', test_user_id;
    
    -- Criar um job simples
    INSERT INTO public.background_jobs (
        type,
        status,
        payload,
        progress,
        user_id
    ) VALUES (
        'transaction_import',
        'pending',
        '{}'::jsonb,
        0,
        test_user_id
    ) RETURNING id INTO test_job_id;
    
    RAISE NOTICE '✅ Job criado: %', test_job_id;
    
    -- Atualizar para completed
    UPDATE public.background_jobs
    SET status = 'completed', progress = 100
    WHERE id = test_job_id;
    
    RAISE NOTICE '✅ Job atualizado para completed';
    
    -- Verificar se notificação foi criada - sem usar EXISTS inicialmente
    DECLARE
        notification_count INTEGER;
    BEGIN
        SELECT COUNT(*) 
        INTO notification_count
        FROM public.notifications
        WHERE user_id = test_user_id
        AND category = 'background_job';
        
        RAISE NOTICE 'Notificações de background_job para este usuário: %', notification_count;
        
        -- Tentar busca mais específica
        SELECT COUNT(*)
        INTO notification_count
        FROM public.notifications
        WHERE related_entity_type = 'background_job';
        
        RAISE NOTICE 'Total de notificações de background_job: %', notification_count;
    END;
    
    -- Limpeza
    DELETE FROM public.notifications WHERE user_id = test_user_id AND category = 'background_job';
    DELETE FROM public.background_jobs WHERE id = test_job_id;
    
    RAISE NOTICE '✅ Dados de teste removidos';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERRO: % - %', SQLSTATE, SQLERRM;
END $$;
