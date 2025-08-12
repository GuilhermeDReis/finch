import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import backgroundJobService, { type BackgroundJob, type BackgroundJobResult } from '@/services/backgroundJobService';
import { notificationService } from '@/services/notificationService';
import { getLogger } from '@/utils/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';

const logger = getLogger('useBackgroundJobMonitor');

interface UseBackgroundJobMonitorOptions {
  /** Se deve mostrar notificações automáticas quando jobs completarem */
  showNotifications?: boolean;
  /** Intervalo de polling em ms (padrão: 30s) */
  pollingInterval?: number;
  /** Se deve monitorar apenas jobs ativos */
  activeJobsOnly?: boolean;
}

interface JobMonitorState {
  jobs: BackgroundJob[];
  activeJobs: BackgroundJob[];
  completedJobs: BackgroundJob[];
  loading: boolean;
  error: string | null;
}

export function useBackgroundJobMonitor(options: UseBackgroundJobMonitorOptions = {}) {
  const {
    showNotifications = true,
    pollingInterval = 30000, // 30 segundos
    activeJobsOnly = false
  } = options;

  const { toast } = useToast();
  const [state, setState] = useState<JobMonitorState>({
    jobs: [],
    activeJobs: [],
    completedJobs: [],
    loading: true,
    error: null
  });

  const previousJobsRef = useRef<BackgroundJob[]>([]);
  const subscriptionsRef = useRef<Map<string, RealtimeChannel>>(new Map());

  // Função para processar e categorizar jobs
  const processJobs = (jobs: BackgroundJob[]) => {
    const activeJobs = jobs.filter(job => 
      job.status === 'pending' || job.status === 'processing'
    );
    
    const completedJobs = jobs.filter(job => 
      job.status === 'completed' || job.status === 'failed'
    );

    return {
      jobs: activeJobsOnly ? activeJobs : jobs,
      activeJobs,
      completedJobs,
      loading: false,
      error: null
    };
  };

  // Função para verificar se um job completado teve sucesso real (sem erros)
  const hasJobSucceeded = (job: BackgroundJob): boolean => {
    return job.status === 'completed' && (!job.result?.errors || job.result.errors.length === 0);
  };

  // Função para detectar jobs recém-completados e mostrar notificações
  const checkForCompletedJobs = (currentJobs: BackgroundJob[], previousJobs: BackgroundJob[]) => {
    if (!showNotifications || previousJobs.length === 0) return;

    const previousJobsMap = new Map(previousJobs.map(job => [job.id, job]));

    currentJobs.forEach(currentJob => {
      const previousJob = previousJobsMap.get(currentJob.id);
      
      // Job recém-completado - verificar se teve sucesso real ou se houve erros
      if (
        previousJob && 
        previousJob.status !== 'completed' && 
        currentJob.status === 'completed'
      ) {
        const jobTypeText = getJobTypeText(currentJob.type);
        
        if (hasJobSucceeded(currentJob)) {
          // Sucesso real - sem erros
          const resultText = getResultText(currentJob.result);
          
          // Create success notification in notification center
          notificationService.createBackgroundJobNotification(
            "Processamento Concluído",
            `${jobTypeText} foi concluído com sucesso. ${resultText}`,
            "success",
            currentJob.id,
            {
              jobType: currentJob.type,
              result: currentJob.result
            }
          ).catch(error => {
            logger.error('Error creating success notification', { error, jobId: currentJob.id, jobType: currentJob.type });
            // Fallback to toast if notification fails
            toast({
              title: "✅ Processamento Concluído!",
              description: `${jobTypeText} foi concluído com sucesso. ${resultText}`,
              variant: "default",
              duration: 8000,
            });
          });
        } else {
          // Completado mas com erros - tratar como problema
          const errorCount = currentJob.result?.errors?.length || 0;
          const errorMessage = errorCount > 0 
            ? `Processamento concluído com ${errorCount} erro${errorCount > 1 ? 's' : ''}.`
            : 'Processamento concluído com problemas.';
          
          // Create error notification in notification center
          notificationService.createBackgroundJobNotification(
            "Processamento com Problemas",
            `${jobTypeText}: ${errorMessage}`,
            "error",
            currentJob.id,
            {
              jobType: currentJob.type,
              result: currentJob.result
            }
          ).catch(error => {
            logger.error('Error creating error notification for completed job with errors', { error, jobId: currentJob.id, jobType: currentJob.type });
            // Fallback to toast if notification fails
            toast({
              title: "⚠️ Processamento com Problemas",
              description: `${jobTypeText}: ${errorMessage}`,
              variant: "destructive",
              duration: 10000,
            });
          });
        }
      }
      
      // Job recém-falhado
      else if (
        previousJob && 
        previousJob.status !== 'failed' && 
        currentJob.status === 'failed'
      ) {
        const jobTypeText = getJobTypeText(currentJob.type);
        
        // Create error notification in notification center
        notificationService.createBackgroundJobNotification(
          "Processamento Falhou",
          `${jobTypeText} falhou: ${currentJob.error_message || 'Erro desconhecido'}`,
          "error",
          currentJob.id,
          {
            jobType: currentJob.type,
            error: currentJob.error_message
          }
        ).catch(error => {
          logger.error('Error creating error notification', { error, jobId: currentJob.id, jobType: currentJob.type });
          // Fallback to toast if notification fails
          toast({
            title: "❌ Processamento Falhou",
            description: `${jobTypeText} falhou: ${currentJob.error_message || 'Erro desconhecido'}`,
            variant: "destructive",
            duration: 10000,
          });
        });
      }
    });
  };

  // Função para obter texto amigável do tipo de job
  const getJobTypeText = (type: string): string => {
    switch (type) {
      case 'transaction_import':
        return 'Importação de Transações';
      case 'transaction_categorization':
        return 'Categorização de Transações';
      default:
        return 'Processamento';
    }
  };

  // Função para obter texto do resultado (apenas sucessos, erros são tratados separadamente)
  const getResultText = (result: BackgroundJobResult | undefined): string => {
    if (!result) return '';

    const parts: string[] = [];
    if ('imported' in result && typeof result.imported === 'number') {
      parts.push(`${result.imported} importadas`);
    }
    if ('skipped' in result && typeof result.skipped === 'number') {
      parts.push(`${result.skipped} ignoradas`);
    }
    if ('categorized' in result && typeof result.categorized === 'number') {
      parts.push(`${result.categorized} categorizadas`);
    }
    if ('failed' in result && typeof result.failed === 'number' && result.failed > 0) {
      parts.push(`${result.failed} falharam`);
    }
    
    return parts.length > 0 ? `(${parts.join(', ')})` : '';
  };

  // Função para carregar jobs
  const loadJobs = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const jobs = await backgroundJobService.getUserJobs(20);
      const newState = processJobs(jobs);
      
      // Verificar jobs recém-completados
      checkForCompletedJobs(jobs, previousJobsRef.current);
      
      // Atualizar estado
      setState(newState);
      previousJobsRef.current = jobs;
      
    } catch (error) {
      logger.error('Error loading background jobs', { error });
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Erro ao carregar jobs em background'
      }));
    }
  };

  // Configurar subscrições para jobs ativos
  const setupSubscriptions = (activeJobs: BackgroundJob[]) => {
    // Limpar subscrições existentes
    subscriptionsRef.current.forEach(channel => channel.unsubscribe());
    subscriptionsRef.current.clear();

    // Criar novas subscrições para jobs ativos
    activeJobs.forEach(job => {
      if (subscriptionsRef.current.has(job.id)) return;

      const channel = backgroundJobService.subscribeToJobUpdates(job.id, (updatedJob) => {
        setState(prev => {
          const updatedJobs = prev.jobs.map(j => j.id === updatedJob.id ? updatedJob : j);
          
          // Verificar se este job foi recém-completado
          const previousJob = prev.jobs.find(j => j.id === updatedJob.id);
          if (previousJob) {
            checkForCompletedJobs([updatedJob], [previousJob]);
          }
          
          return processJobs(updatedJobs);
        });
      });

      subscriptionsRef.current.set(job.id, channel);
    });
  };

  // Carregar jobs inicialmente
  useEffect(() => {
    loadJobs();
  }, []);

  // Configurar polling
  useEffect(() => {
    if (pollingInterval <= 0) return;

    const interval = setInterval(loadJobs, pollingInterval);
    return () => clearInterval(interval);
  }, [pollingInterval]);

  // Configurar subscrições quando jobs ativos mudarem
  useEffect(() => {
    if (state.activeJobs.length > 0) {
      setupSubscriptions(state.activeJobs);
    }
  }, [state.activeJobs]);

  // Limpar subscrições na desmontagem
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach(channel => channel.unsubscribe());
      subscriptionsRef.current.clear();
    };
  }, []);

  return {
    ...state,
    refetch: loadJobs,
    hasActiveJobs: state.activeJobs.length > 0,
    hasCompletedJobs: state.completedJobs.length > 0
  };
}
