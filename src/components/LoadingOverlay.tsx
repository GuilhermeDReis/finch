
import React from 'react';
import { Loader2, Bot } from 'lucide-react';
import { Progress } from './ui/progress';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  progress?: number;
  subMessage?: string;
}

export function LoadingOverlay({ 
  isVisible, 
  message = "Processando com IA...", 
  progress = 0,
  subMessage = "Aguarde enquanto categorizamos suas transações automaticamente..."
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="flex flex-col items-center gap-6 p-8 bg-card rounded-lg shadow-lg border min-w-96">
        <div className="flex items-center gap-3">
          <Bot className="h-8 w-8 text-primary" />
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">{message}</h3>
          <p className="text-sm text-muted-foreground">
            {subMessage}
          </p>
        </div>
        
        <div className="w-full space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progresso</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
          {progress < 100 && (
            <div className="text-xs text-muted-foreground text-center">
              {progress < 30 ? "Inicializando..." : 
               progress < 60 ? "Processando dados..." :
               progress < 90 ? "Finalizando..." : "Quase pronto!"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
