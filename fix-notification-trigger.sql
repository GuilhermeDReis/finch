-- Fix notification trigger for background job completion
-- Execute this script if the notification trigger is not working properly

-- First, drop and recreate the function with better logging
DROP FUNCTION IF EXISTS create_background_job_notification() CASCADE;

CREATE OR REPLACE FUNCTION create_background_job_notification()
RETURNS TRIGGER AS $$
DECLARE
    notification_title TEXT;
    notification_message TEXT;
    notification_type TEXT;
BEGIN
    -- Log the trigger execution
    RAISE NOTICE 'TRIGGER: Background job notification trigger fired for job %, status changed from % to %', 
        NEW.id, COALESCE(OLD.status, 'NULL'), NEW.status;
    
    -- Only create notification when job is completed or failed
    -- Check both OLD.status IS NULL (INSERT) or OLD.status != NEW.status (UPDATE)
    IF NEW.status IN ('completed', 'failed') AND (OLD IS NULL OR OLD.status IS NULL OR OLD.status != NEW.status) THEN
        RAISE NOTICE 'TRIGGER: Creating notification for job % with status %', NEW.id, NEW.status;
        
        -- Determine notification details based on job type and status
        CASE NEW.type
            WHEN 'transaction_import' THEN
                notification_title := CASE NEW.status
                    WHEN 'completed' THEN 'Importação Concluída'
                    WHEN 'failed' THEN 'Importação Falhou'
                END;
                notification_message := CASE NEW.status
                    WHEN 'completed' THEN 'Suas transações foram importadas com sucesso.'
                    WHEN 'failed' THEN 'Erro ao importar transações: ' || COALESCE(NEW.error_message, 'Erro desconhecido')
                END;
            WHEN 'transaction_categorization' THEN
                notification_title := CASE NEW.status
                    WHEN 'completed' THEN 'Categorização Concluída'
                    WHEN 'failed' THEN 'Categorização Falhou'
                END;
                notification_message := CASE NEW.status
                    WHEN 'completed' THEN 'Suas transações foram categorizadas automaticamente.'
                    WHEN 'failed' THEN 'Erro ao categorizar transações: ' || COALESCE(NEW.error_message, 'Erro desconhecido')
                END;
            ELSE
                notification_title := CASE NEW.status
                    WHEN 'completed' THEN 'Processamento Concluído'
                    WHEN 'failed' THEN 'Processamento Falhou'
                END;
                notification_message := CASE NEW.status
                    WHEN 'completed' THEN 'Seu processamento foi concluído.'
                    WHEN 'failed' THEN 'Erro no processamento: ' || COALESCE(NEW.error_message, 'Erro desconhecido')
                END;
        END CASE;

        notification_type := CASE NEW.status
            WHEN 'completed' THEN 'success'
            WHEN 'failed' THEN 'error'
        END;

        -- Insert notification
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
                    'created_by', 'database_trigger'
                )
            );
            
            RAISE NOTICE 'TRIGGER: Successfully created notification for job %', NEW.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'TRIGGER: Failed to create notification for job %: % %', NEW.id, SQLSTATE, SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'TRIGGER: Conditions not met for job % - status: %, old_status: %', 
            NEW.id, NEW.status, COALESCE(OLD.status, 'NULL');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS trigger_background_job_notification ON public.background_jobs;
CREATE TRIGGER trigger_background_job_notification
    AFTER UPDATE ON public.background_jobs
    FOR EACH ROW
    EXECUTE FUNCTION create_background_job_notification();

-- Also add a trigger for INSERT (when jobs are created directly as completed)
CREATE TRIGGER trigger_background_job_notification_insert
    AFTER INSERT ON public.background_jobs
    FOR EACH ROW
    EXECUTE FUNCTION create_background_job_notification();

-- Grant necessary permissions
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.background_jobs TO service_role;

-- Test the trigger with a sample job
DO $$
DECLARE
    user_uuid UUID;
    job_uuid UUID;
    notification_count INTEGER;
BEGIN
    -- Get a user ID
    SELECT id INTO user_uuid FROM auth.users ORDER BY created_at DESC LIMIT 1;
    
    IF user_uuid IS NOT NULL THEN
        RAISE NOTICE 'Testing trigger with user: %', user_uuid;
        
        -- Insert a test job
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
        
        RAISE NOTICE 'Created test job: %', job_uuid;
        
        -- Update to completed (should trigger notification)
        UPDATE public.background_jobs 
        SET 
            status = 'completed', 
            progress = 100, 
            completed_at = now(),
            updated_at = now(),
            result = '{"imported": 5, "skipped": 0, "errors": []}'
        WHERE id = job_uuid;
        
        -- Check if notification was created
        SELECT COUNT(*) INTO notification_count
        FROM public.notifications 
        WHERE related_entity_id = job_uuid;
        
        IF notification_count > 0 THEN
            RAISE NOTICE '✅ SUCCESS: Trigger created notification for test job';
        ELSE
            RAISE NOTICE '❌ FAILURE: No notification created by trigger';
        END IF;
        
        -- Clean up test data
        DELETE FROM public.notifications WHERE related_entity_id = job_uuid;
        DELETE FROM public.background_jobs WHERE id = job_uuid;
        
    ELSE
        RAISE NOTICE 'No user found to test with';
    END IF;
END $$;
