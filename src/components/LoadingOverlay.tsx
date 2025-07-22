
import React from 'react';
import { Loader2, Bot } from 'lucide-react';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function LoadingOverlay({ isVisible, message = "Processando com IA..." }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="flex flex-col items-center gap-6 p-8 bg-card rounded-lg shadow-lg border">
        <div className="flex items-center gap-3">
          <Bot className="h-8 w-8 text-primary" />
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">{message}</h3>
          <p className="text-sm text-muted-foreground">
            Aguarde enquanto categorizamos suas transações automaticamente...
          </p>
        </div>
        
        <div className="w-64 bg-muted rounded-full h-2">
          <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    </div>
  );
}
