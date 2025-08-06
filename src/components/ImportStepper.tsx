import React from 'react';
import { Check, Upload, Search, AlertTriangle, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportStepperProps {
  currentStep: 'upload' | 'identify' | 'duplicate-analysis' | 'processing' | 'categorization' | 'completion' | 'manual-selection';
  layoutType?: 'bank' | 'credit_card' | null;
}

const steps = [
  {
    id: 'upload',
    title: 'Upload',
    icon: Upload,
    description: 'Enviar arquivo'
  },
  {
    id: 'identify', 
    title: 'Identificar',
    icon: Search,
    description: 'Selecionar origem'
  },
  {
    id: 'duplicate-analysis',
    title: 'Duplicatas',
    icon: AlertTriangle,
    description: 'Analisar duplicatas'
  },
  {
    id: 'categorization',
    title: 'Categorizar',
    icon: FileText,
    description: 'Revisar transações'
  },
  {
    id: 'completion',
    title: 'Concluído',
    icon: CheckCircle,
    description: 'Importação finalizada'
  }
];

export function ImportStepper({ currentStep, layoutType }: ImportStepperProps) {
  const getCurrentStepIndex = () => {
    if (currentStep === 'processing') return 2; // Show as duplicate-analysis during processing
    if (currentStep === 'manual-selection') return 0; // Show as upload during manual selection
    return steps.findIndex(step => step.id === currentStep);
  };

  const currentStepIndex = getCurrentStepIndex();

  // Filter steps based on layout type - credit card usually skips duplicate analysis
  const visibleSteps = steps.filter((step, index) => {
    // Show duplicate-analysis only if we're currently on it or have passed it
    if (step.id === 'duplicate-analysis') {
      return currentStepIndex >= 2 || currentStep === 'duplicate-analysis';
    }
    return true;
  });

  return (
    <div className="w-full py-6 border-b bg-gray-50/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {visibleSteps.map((step, index) => {
            const Icon = step.icon;
            const actualIndex = steps.findIndex(s => s.id === step.id);
            const isActive = actualIndex === currentStepIndex;
            const isCompleted = actualIndex < currentStepIndex;
            const isUpcoming = actualIndex > currentStepIndex;
            
            // Special handling for processing step
            const isProcessing = currentStep === 'processing' && step.id === 'duplicate-analysis';

            return (
              <div key={step.id} className="flex items-center">
                {/* Step circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                      {
                        "bg-blue-600 border-blue-600 text-white": isActive,
                        "bg-green-600 border-green-600 text-white": isCompleted,
                        "bg-gray-100 border-gray-300 text-gray-400": isUpcoming,
                        "bg-blue-600 border-blue-600 text-white animate-pulse": isProcessing,
                      }
                    )}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  
                  {/* Step info */}
                  <div className="mt-2 text-center">
                    <div
                      className={cn(
                        "text-sm font-medium transition-colors duration-300",
                        {
                          "text-blue-600": isActive || isProcessing,
                          "text-green-600": isCompleted,
                          "text-gray-400": isUpcoming,
                        }
                      )}
                    >
                      {step.title}
                    </div>
                    <div
                      className={cn(
                        "text-xs transition-colors duration-300 mt-1",
                        {
                          "text-blue-500": isActive || isProcessing,
                          "text-green-500": isCompleted,
                          "text-gray-400": isUpcoming,
                        }
                      )}
                    >
                      {isProcessing ? 'Processando...' : step.description}
                    </div>
                  </div>
                </div>

                {/* Connector line */}
                {index < visibleSteps.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-4 transition-colors duration-300 min-w-12",
                      {
                        "bg-green-600": actualIndex < currentStepIndex,
                        "bg-blue-600": actualIndex === currentStepIndex - 1 || isProcessing,
                        "bg-gray-300": actualIndex >= currentStepIndex && !isProcessing,
                      }
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Additional step info */}
        {layoutType && (
          <div className="text-center mt-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {layoutType === 'credit_card' ? '💳 Cartão de Crédito' : '🏦 Conta Bancária'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
