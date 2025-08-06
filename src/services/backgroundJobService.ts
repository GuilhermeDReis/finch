import { supabase } from '@/integrations/supabase/client';
import type { TransactionRow } from '@/types/transaction';

export interface BackgroundJob {
  id: string;
  type: 'transaction_import' | 'transaction_categorization';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payload: any;
  progress: number;
  result?: any;
  error_message?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface ImportJobPayload {
  transactions: TransactionRow[];
  selectedBank: string;
  selectedCreditCardId?: string;
  layoutType: 'bank' | 'credit_card';
  importMode: 'new-only' | 'update-existing' | 'import-all';
}

class BackgroundJobService {
  
  /**
   * Criar um job de importação em background
   */
  async createImportJob(payload: ImportJobPayload): Promise<BackgroundJob | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: job, error } = await supabase
        .from('background_jobs')
        .insert({
          type: 'transaction_import',
          status: 'pending',
          payload: payload,
          progress: 0,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [BACKGROUND-JOB] Error creating import job:', error);
        return null;
      }

      console.log('✅ [BACKGROUND-JOB] Import job created:', job.id);
      return job;
    } catch (error) {
      console.error('💥 [BACKGROUND-JOB] Exception creating import job:', error);
      return null;
    }
  }

  /**
   * Acompanhar o progresso de um job
   */
  async getJobStatus(jobId: string): Promise<BackgroundJob | null> {
    try {
      const { data: job, error } = await supabase
        .from('background_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('❌ [BACKGROUND-JOB] Error fetching job status:', error);
        return null;
      }

      return job;
    } catch (error) {
      console.error('💥 [BACKGROUND-JOB] Exception fetching job status:', error);
      return null;
    }
  }

  /**
   * Cancelar um job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('background_jobs')
        .update({ status: 'cancelled' })
        .eq('id', jobId);

      if (error) {
        console.error('❌ [BACKGROUND-JOB] Error cancelling job:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('💥 [BACKGROUND-JOB] Exception cancelling job:', error);
      return false;
    }
  }

  /**
   * Subscribir para atualizações em tempo real do job
   */
  subscribeToJobUpdates(jobId: string, callback: (job: BackgroundJob) => void) {
    const channel = supabase
      .channel(`background_job_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'background_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          callback(payload.new as BackgroundJob);
        }
      )
      .subscribe();

    return channel;
  }

  /**
   * Processar jobs em background (seria executado por uma Edge Function)
   */
  async processImportJob(job: BackgroundJob): Promise<void> {
    try {
      console.log('🔄 [BACKGROUND-JOB] Starting processing job:', job.id);
      
      // Atualizar status para processing
      await supabase
        .from('background_jobs')
        .update({ 
          status: 'processing', 
          progress: 10,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      const payload = job.payload as ImportJobPayload;
      
      // Executar o processamento (categorização com IA, mapeamentos, etc.)
      // Este código seria executado pela Edge Function
      const result = await this.executeImportProcess(payload, job.id);
      
      // Atualizar com resultado final
      await supabase
        .from('background_jobs')
        .update({ 
          status: 'completed',
          progress: 100,
          result: result,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      console.log('✅ [BACKGROUND-JOB] Job completed successfully:', job.id);
      
    } catch (error) {
      console.error('❌ [BACKGROUND-JOB] Error processing job:', error);
      
      await supabase
        .from('background_jobs')
        .update({ 
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);
    }
  }

  private async executeImportProcess(payload: ImportJobPayload, jobId: string) {
    // Esta função executaria todo o processo atual de importação
    // mas de forma assíncrona em background
    
    // 1. Aplicar mapeamentos existentes
    // 2. Categorizar com IA apenas transações não mapeadas
    // 3. Salvar no banco de dados
    // 4. Criar/atualizar mapeamentos
    
    return {
      imported: payload.transactions.length,
      skipped: 0,
      errors: []
    };
  }

  /**
   * Listar jobs do usuário atual
   */
  async getUserJobs(limit: number = 10): Promise<BackgroundJob[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: jobs, error } = await supabase
        .from('background_jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ [BACKGROUND-JOB] Error fetching user jobs:', error);
        return [];
      }

      return jobs || [];
    } catch (error) {
      console.error('💥 [BACKGROUND-JOB] Exception fetching user jobs:', error);
      return [];
    }
  }
}

export default new BackgroundJobService();
