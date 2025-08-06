const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://hjwnykqbdecjrbqpweak.supabase.co";
// Você precisará usar uma chave service_role para executar DDL
// Esta chave deve ser obtida do painel do Supabase: Settings > API > service_role secret (não committar!)
const SUPABASE_SERVICE_KEY = "SEU_SERVICE_ROLE_KEY_AQUI";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const migrationSQL = `
-- Create background_jobs table for async processing
CREATE TABLE IF NOT EXISTS public.background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('transaction_import', 'transaction_categorization')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    payload JSONB NOT NULL,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_background_jobs_user_id ON public.background_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_background_jobs_status ON public.background_jobs(status);
CREATE INDEX IF NOT EXISTS idx_background_jobs_type ON public.background_jobs(type);
CREATE INDEX IF NOT EXISTS idx_background_jobs_created_at ON public.background_jobs(created_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_background_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_background_jobs_updated_at ON public.background_jobs;
CREATE TRIGGER trigger_update_background_jobs_updated_at
    BEFORE UPDATE ON public.background_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_background_jobs_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own background jobs"
    ON public.background_jobs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own background jobs"
    ON public.background_jobs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own background jobs"
    ON public.background_jobs FOR UPDATE
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.background_jobs TO authenticated;
GRANT ALL ON public.background_jobs TO service_role;

-- Create a cleanup function to remove old completed/failed jobs
CREATE OR REPLACE FUNCTION cleanup_old_background_jobs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete jobs older than 7 days that are completed, failed, or cancelled
    DELETE FROM public.background_jobs
    WHERE (status IN ('completed', 'failed', 'cancelled'))
    AND created_at < (now() - INTERVAL '7 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup (optional)
    RAISE INFO 'Cleaned up % old background jobs', deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
`;

async function createBackgroundJobsTable() {
    try {
        console.log('🚀 Criando tabela background_jobs...');
        
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: migrationSQL
        });
        
        if (error) {
            console.error('❌ Erro ao criar tabela:', error);
            return;
        }
        
        console.log('✅ Tabela background_jobs criada com sucesso!');
        console.log('Resultado:', data);
        
    } catch (error) {
        console.error('💥 Erro na execução:', error);
    }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
    createBackgroundJobsTable();
}

module.exports = { createBackgroundJobsTable };
