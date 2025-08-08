-- Script para criar a função e trigger que estão faltando
-- Execute este script completo no SQL Editor do Supabase

-- 1. Remover qualquer trigger órfão que possa existir
DROP TRIGGER IF EXISTS trigger_background_job_notification ON public.background_jobs;
DROP TRIGGER IF EXISTS trigger_background_job_notification_insert ON public.background_jobs;

-- 2. Criar a função do trigger (que estava faltando!)
CREATE OR REPLACE FUNCTION create_background_job_notification()
RETURNS TRIGGER AS $$
DECLARE
    notification_title TEXT;
    notification_message TEXT;
    notification_type TEXT;
BEGIN
    -- Log para debug
    RAISE NOTICE '[TRIGGER] Job % mudou status de % para %', 
        NEW.id, 
        COALESCE(OLD.status, 'NULL'), 
        NEW.status;
    
    -- Só criar notificação quando job é completed ou failed
    IF NEW.status IN ('completed', 'failed') AND (OLD IS NULL OR OLD.status IS NULL OR OLD.status != NEW.status) THEN
        
        RAISE NOTICE '[TRIGGER] Criando notificação para job %', NEW.id;
        
        -- Definir título e mensagem baseado no tipo de job
        CASE NEW.type
            WHEN 'transaction_import' THEN
                notification_title := CASE NEW.status
                    WHEN 'completed' THEN 'Importação Concluída ✅'
                    WHEN 'failed' THEN 'Importação Falhou ❌'
                END;
                notification_message := CASE NEW.status
                    WHEN 'completed' THEN 'Suas transações foram importadas com sucesso!'
                    WHEN 'failed' THEN 'Erro ao importar transações: ' || COALESCE(NEW.error_message, 'Erro desconhecido')
                END;
            WHEN 'transaction_categorization' THEN
                notification_title := CASE NEW.status
                    WHEN 'completed' THEN 'Categorização Concluída ✅'
                    WHEN 'failed' THEN 'Categorização Falhou ❌'
                END;
                notification_message := CASE NEW.status
                    WHEN 'completed' THEN 'Suas transações foram categorizadas automaticamente.'
                    WHEN 'failed' THEN 'Erro ao categorizar transações: ' || COALESCE(NEW.error_message, 'Erro desconhecido')
                END;
            ELSE
                notification_title := CASE NEW.status
                    WHEN 'completed' THEN 'Processamento Concluído ✅'
                    WHEN 'failed' THEN 'Processamento Falhou ❌'
                END;
                notification_message := CASE NEW.status
                    WHEN 'completed' THEN 'Seu processamento foi concluído com sucesso.'
                    WHEN 'failed' THEN 'Erro no processamento: ' || COALESCE(NEW.error_message, 'Erro desconhecido')
                END;
        END CASE;

        notification_type := CASE NEW.status
            WHEN 'completed' THEN 'success'
            WHEN 'failed' THEN 'error'
        END;

        -- Inserir a notificação
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
                NEW.user_id,
                notification_title,
                notification_message,
                notification_type,
                'background_job',
                'background_job',
                NEW.id,
                jsonb_build_object(
                    'job_type', NEW.type,
                    'job_status', NEW.status,
                    'progress', NEW.progress,
                    'completed_at', NEW.completed_at,
                    'result', NEW.result,
                    'created_by', 'database_trigger'
                )
            );
            
            RAISE NOTICE '[TRIGGER] ✅ Notificação criada com sucesso!';
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '[TRIGGER] ❌ Erro ao criar notificação: % - %', SQLSTATE, SQLERRM;
        END;
    ELSE
        RAISE NOTICE '[TRIGGER] Condições não atendidas - não criando notificação';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar o trigger
CREATE TRIGGER trigger_background_job_notification
    AFTER UPDATE ON public.background_jobs
    FOR EACH ROW
    EXECUTE FUNCTION create_background_job_notification();

-- 4. Garantir permissões
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.background_jobs TO service_role;

-- 5. Verificar se foi criado corretamente
SELECT 
    'Função criada:' as info,
    routine_name
FROM information_schema.routines 
WHERE routine_name = 'create_background_job_notification'
AND routine_schema = 'public';

SELECT 
    'Trigger criado:' as info,
    trigger_name,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_background_job_notification';

-- 6. Teste rápido
DO $$
DECLARE
    test_user_id UUID;
    test_job_id UUID;
    notification_count INTEGER;
BEGIN
    -- Pegar usuário de teste
    SELECT id INTO test_user_id FROM auth.users ORDER BY created_at DESC LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '❌ Nenhum usuário para teste';
        RETURN;
    END IF;
    
    RAISE NOTICE '🧪 Testando trigger com usuário: %', test_user_id;
    
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
        '{"trigger_test": true}'::jsonb,
        0,
        test_user_id
    ) RETURNING id INTO test_job_id;
    
    RAISE NOTICE '🧪 Job criado: %', test_job_id;
    
    -- Aguardar 1 segundo
    PERFORM pg_sleep(1);
    
    -- Atualizar para completed (deve disparar trigger)
    UPDATE public.background_jobs 
    SET 
        status = 'completed',
        progress = 100,
        completed_at = now(),
        result = '{"imported": 3, "test": true}'::jsonb
    WHERE id = test_job_id;
    
    RAISE NOTICE '🧪 Job atualizado para completed';
    
    -- Verificar se notificação foi criada
    PERFORM pg_sleep(1);
    
    SELECT COUNT(*) INTO notification_count
    FROM public.notifications 
    WHERE related_entity_id = test_job_id;
    
    IF notification_count > 0 THEN
        RAISE NOTICE '🧪 ✅ SUCCESS! Trigger funcionou - % notificação criada', notification_count;
    ELSE
        RAISE NOTICE '🧪 ❌ FAILURE! Trigger não funcionou';
    END IF;
    
    -- Limpeza
    DELETE FROM public.notifications WHERE related_entity_id = test_job_id;
    DELETE FROM public.background_jobs WHERE id = test_job_id;
    
    RAISE NOTICE '🧪 Teste concluído e limpo';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '🧪 ❌ Erro no teste: % - %', SQLSTATE, SQLERRM;
END $$;

-- Mensagem final
SELECT '✅ Trigger criado! Agora teste uma importação real.' as resultado;
