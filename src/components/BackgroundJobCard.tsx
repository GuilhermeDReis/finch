import React, { useState, useEffect } from 'react';
import { getLogger } from '@/utils/logger';

const logger = getLogger('backgroundJobCard');
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, Play, Pause, X, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import backgroundJobService, { type BackgroundJob, type BackgroundJobResult } from '@/services/backgroundJobService';
import type { VariantProps } from 'class-variance-authority';

// Define a strict type for Badge variant
type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

interface BackgroundJobCardProps {
  jobId: string;
  onComplete?: (result: BackgroundJobResult | undefined) => void;
  onError?: (error: string) => void;
  showActions?: boolean;
}

export default function BackgroundJobCard({ 
  jobId, 
  onComplete, 
  onError, 
  showActions = true 
}: BackgroundJobCardProps) {
  const [job, setJob] = useState<BackgroundJob | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Carregar status inicial do job
    loadJobStatus();
    
    // Subscrever para atualizações em tempo real
    const channel = backgroundJobService.subscribeToJobUpdates(jobId, (updatedJob) => {
      setJob(updatedJob);
      
      // Notificar quando completado
      if (updatedJob.status === 'completed' && onComplete) {
        onComplete(updatedJob.result);
      }
      
      // Notificar quando falhou
      if (updatedJob.status === 'failed' && onError) {
        onError(updatedJob.error_message || 'Job failed');
      }
    });

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [jobId, onComplete, onError]);

  const loadJobStatus = async () => {
    setLoading(true);
    try {
      const jobStatus = await backgroundJobService.getJobStatus(jobId);
      setJob(jobStatus);
    } catch (error) {
      logger.error('Error loading job status', { jobId, error: error instanceof Error ? error.message : 'Unknown error' });
      toast({
        title: "Erro",
        description: "Não foi possível carregar o status do job",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelJob = async () => {
    if (!job) return;
    
    const success = await backgroundJobService.cancelJob(job.id);
    if (success) {
      toast({
        title: "Job cancelado",
        description: "O processamento foi cancelado com sucesso",
        variant: "default"
      });
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível cancelar o job",
        variant: "destructive"
      });
    }
  };

  // Função para verificar se um job completado teve sucesso real (sem erros)
  const hasJobSucceeded = (job: BackgroundJob): boolean => {
    return job.status === 'completed' && (!job.result?.errors || job.result.errors.length === 0);
  };

  const getStatusIcon = () => {
    if (!job) return <Clock className="h-4 w-4" />;
    
    switch (job.status) {
      case 'completed':
        return hasJobSucceeded(job) 
          ? <CheckCircle className="h-4 w-4 text-green-600" />
          : <XCircle className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (): BadgeVariant => {
    if (!job) return 'secondary';
    
    switch (job.status) {
      case 'completed':
        return hasJobSucceeded(job) ? 'default' : 'destructive';
      case 'failed':
        return 'destructive';
      case 'processing':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getStatusText = () => {
    if (!job) return 'Carregando...';
    
    switch (job.status) {
      case 'pending':
        return 'Aguardando processamento';
      case 'processing':
        return 'Processando...';
      case 'completed':
        return hasJobSucceeded(job) ? 'Concluído' : 'Concluído com Problemas';
      case 'failed':
        return 'Falhou';
      default:
        return job.status;
    }
  };

  const formatJobType = (type: string) => {
    switch (type) {
      case 'transaction_import':
        return 'Importação de Transações';
      case 'transaction_categorization':
        return 'Categorização de Transações';
      default:
        return type;
    }
  };

  // Texto amigável para o resultado (sucessos)
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Carregando status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!job) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Não foi possível carregar as informações do processamento.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            {formatJobType(job.type)}
          </div>
          <Badge variant={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progresso</span>
            <span>{job.progress}%</span>
          </div>
          <Progress value={job.progress} className="h-2" />
        </div>

        {/* Job Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Iniciado:</span>
            <span>{new Date(job.created_at).toLocaleString()}</span>
          </div>
          {job.updated_at && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Última atualização:</span>
              <span>{new Date(job.updated_at).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {job.status === 'failed' && job.error_message && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{job.error_message}</AlertDescription>
          </Alert>
        )}

        {/* Success Result */}
        {job.status === 'completed' && job.result && hasJobSucceeded(job) && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Processamento concluído com sucesso!</strong>
              <br />
              {getResultText(job.result)}
            </AlertDescription>
          </Alert>
        )}

        {/* Completed with Errors */}
        {job.status === 'completed' && job.result && !hasJobSucceeded(job) && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Processamento concluído com problemas!</strong>
              <br />
              {getResultText(job.result)}
              {job.result.errors?.length > 0 && (
                <>
                  <br />
                  <span className="text-red-600">
                    {job.result.errors.length} erro{job.result.errors.length > 1 ? 's' : ''} encontrado{job.result.errors.length > 1 ? 's' : ''}
                  </span>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2">
            {(job.status === 'pending' || job.status === 'processing') && (
              <Button variant="destructive" onClick={handleCancelJob}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            )}
            <Button variant="secondary" onClick={loadJobStatus}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
