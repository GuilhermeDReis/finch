import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useBackgroundJobMonitor } from '@/hooks/useBackgroundJobMonitor';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface BackgroundJobIndicatorProps {
  /** Se deve mostrar o indicador apenas quando há jobs ativos */
  hideWhenEmpty?: boolean;
  /** Se deve mostrar notificações toast */
  showNotifications?: boolean;
}

export default function BackgroundJobIndicator({
  hideWhenEmpty = true,
  showNotifications = true
}: BackgroundJobIndicatorProps) {
  const {
    activeJobs,
    completedJobs,
    loading,
    error,
    hasActiveJobs,
    refetch
  } = useBackgroundJobMonitor({
    showNotifications,
    pollingInterval: 15000, // 15 segundos - mais frequente para indicador
    activeJobsOnly: false
  });

  // Se deve esconder quando não há jobs ativos e a opção estiver habilitada
  if (hideWhenEmpty && !hasActiveJobs && completedJobs.length === 0) {
    return null;
  }

  const getJobTypeText = (type: string): string => {
    switch (type) {
      case 'transaction_import':
        return 'Importação';
      case 'transaction_categorization':
        return 'Categorização';
      default:
        return type;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-600" />;
      case 'processing':
        return <RefreshCw className="h-3 w-3 text-blue-600 animate-spin" />;
      default:
        return <RefreshCw className="h-3 w-3 text-yellow-600" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative h-8 px-2"
        >
          {hasActiveJobs ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin mr-1" />
              <span className="text-xs">
                {activeJobs.length} em processamento
              </span>
              {activeJobs.length > 0 && (
                <Badge 
                  variant="default" 
                  className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs"
                >
                  {activeJobs.length}
                </Badge>
              )}
            </>
          ) : completedJobs.length > 0 ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-xs">Jobs concluídos</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-1" />
              <span className="text-xs">Jobs</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Processamentos em Background</h4>
            <Button variant="ghost" size="sm" onClick={refetch}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}

          {/* Jobs Ativos */}
          {activeJobs.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-muted-foreground">Em Processamento</h5>
              {activeJobs.map(job => (
                <Card key={job.id} className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <span className="text-sm font-medium">
                          {getJobTypeText(job.type)}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {job.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progresso</span>
                        <span>{job.progress}%</span>
                      </div>
                      <Progress value={job.progress} className="h-1" />
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Iniciado: {new Date(job.created_at).toLocaleString()}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Jobs Recentes Concluídos */}
          {completedJobs.slice(0, 3).length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-muted-foreground">Recentes</h5>
              {completedJobs.slice(0, 3).map(job => (
                <div key={job.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(job.status)}
                    <div>
                      <div className="text-sm">{getJobTypeText(job.type)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(job.updated_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Badge 
                    variant={job.status === 'completed' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {job.status === 'completed' ? 'Concluído' : 'Falhou'}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {activeJobs.length === 0 && completedJobs.length === 0 && !loading && (
            <div className="text-sm text-muted-foreground text-center py-4">
              Nenhum processamento em background encontrado
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
