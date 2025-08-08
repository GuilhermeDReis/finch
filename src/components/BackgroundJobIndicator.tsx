import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useBackgroundJobMonitor } from '@/hooks/useBackgroundJobMonitor';

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
    hasActiveJobs,
  } = useBackgroundJobMonitor({
    showNotifications,
    pollingInterval: 15000, // 15 segundos - mais frequente para indicador
    activeJobsOnly: false
  });

  // Se deve esconder quando não há jobs ativos e a opção estiver habilitada
  if (hideWhenEmpty && !hasActiveJobs && completedJobs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center">
      {hasActiveJobs && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative h-8 px-2"
          title="Processamentos em andamento - Verifique a central de notificações para mais detalhes"
        >
          <RefreshCw className="h-4 w-4 animate-spin mr-1" />
          <span className="text-xs">
            {activeJobs.length} processando
          </span>
          <Badge 
            variant="default" 
            className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs"
          >
            {activeJobs.length}
          </Badge>
        </Button>
      )}
    </div>
  );
}
