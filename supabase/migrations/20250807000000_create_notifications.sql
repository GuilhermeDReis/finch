-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'background_job', 'transaction', 'system')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    data JSONB DEFAULT '{}', -- Additional data related to the notification
    related_entity_type TEXT, -- e.g., 'background_job', 'transaction'
    related_entity_id UUID, -- ID of the related entity
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE -- Optional expiration date
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_related_entity ON public.notifications(related_entity_type, related_entity_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
    ON public.notifications FOR DELETE
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.notifications 
    SET is_read = TRUE, read_at = now()
    WHERE id = notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.notifications 
    SET is_read = TRUE, read_at = now()
    WHERE user_id = auth.uid() AND is_read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification for background job completion
CREATE OR REPLACE FUNCTION create_background_job_notification()
RETURNS TRIGGER AS $$
DECLARE
    notification_title TEXT;
    notification_message TEXT;
    notification_type TEXT;
BEGIN
    -- Only create notification when job is completed or failed
    IF NEW.status IN ('completed', 'failed') AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
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
                'completed_at', NEW.completed_at
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for background job notifications
DROP TRIGGER IF EXISTS trigger_background_job_notification ON public.background_jobs;
CREATE TRIGGER trigger_background_job_notification
    AFTER UPDATE ON public.background_jobs
    FOR EACH ROW
    EXECUTE FUNCTION create_background_job_notification();

-- Function to cleanup old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete read notifications older than 30 days
    DELETE FROM public.notifications
    WHERE is_read = TRUE 
    AND created_at < (now() - INTERVAL '30 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete expired notifications
    DELETE FROM public.notifications
    WHERE expires_at IS NOT NULL 
    AND expires_at < now();
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    RAISE INFO 'Cleaned up % old notifications', deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
