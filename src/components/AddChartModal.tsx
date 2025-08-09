import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Step1ChartTypeSelection from './wizard/Step1ChartTypeSelection';
import Step2DataConfiguration from './wizard/Step2DataConfiguration';
import Step3VisualCustomization from './wizard/Step3VisualCustomization';
import Step4ReviewAndCreate from './wizard/Step4ReviewAndCreate';
import type { WizardStep1Data, WizardStep2Data, WizardStep3Data, ChartType } from '@/types/chart';

interface AddChartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddChartModal({ isOpen, onClose }: AddChartModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [step1Data, setStep1Data] = useState<WizardStep1Data>({
    chart_type: 'evolution'
  });
  const [step2Data, setStep2Data] = useState<WizardStep2Data>({});
  const [step3Data, setStep3Data] = useState<WizardStep3Data>({
    name: '',
    color: '#3b82f6',
    show_values_on_points: true,
    show_percentages: true,
    show_trend_line: false,
    highlight_min_max: false
  });

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setStep1Data({ chart_type: 'evolution' });
    setStep2Data({});
    setStep3Data({
      name: '',
      color: '#3b82f6',
      show_values_on_points: true,
      show_percentages: true,
      show_trend_line: false,
      highlight_min_max: false
    });
    onClose();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1ChartTypeSelection 
            data={step1Data} 
            onUpdate={setStep1Data}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <Step2DataConfiguration 
            chartType={step1Data.chart_type}
            data={step2Data} 
            onUpdate={setStep2Data}
          />
        );
      case 3:
        return (
          <Step3VisualCustomization 
            chartType={step1Data.chart_type}
            data={step3Data} 
            onUpdate={setStep3Data}
          />
        );
      case 4:
        return (
          <Step4ReviewAndCreate 
            wizardData={{
              step1: step1Data,
              step2: step2Data,
              step3: step3Data
            }}
            onClose={handleClose}
          />
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Escolha do Tipo de Gráfico';
      case 2:
        return 'Configuração dos Dados';
      case 3:
        return 'Personalização Visual';
      case 4:
        return 'Revisão e Criação';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Criar Novo Gráfico</DialogTitle>
          <DialogDescription>
            Siga os passos para criar um gráfico personalizado para análise dos seus gastos.
          </DialogDescription>
        </DialogHeader>
        
        {/* Header with step indicator */}
        <div className="border-b pb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Passo {currentStep} de 4</h2>
          </div>
          
          {/* Step indicator */}
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === currentStep
                      ? 'bg-primary text-primary-foreground'
                      : step < currentStep
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step}
                </div>
                {step < 4 && (
                  <div
                    className={`w-12 h-0.5 mx-2 ${
                      step < currentStep ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          
          <h3 className="text-lg font-semibold mt-4">{getStepTitle()}</h3>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto py-6">
          {renderStep()}
        </div>

        {/* Footer with navigation */}
        {currentStep < 4 && (
          <div className="border-t pt-4 flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </Button>
            
            <Button
              onClick={handleNext}
              className="flex items-center gap-2"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
