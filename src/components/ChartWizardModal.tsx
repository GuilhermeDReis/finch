import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Step1ChartTypeSelection from './wizard/Step1ChartTypeSelection';
import Step2DataConfiguration from './wizard/Step2DataConfiguration';
import Step3VisualCustomization from './wizard/Step3VisualCustomization';
import Step4ReviewAndCreate from './wizard/Step4ReviewAndCreate';
import type { WizardData, WizardStep1Data, WizardStep2Data, WizardStep3Data } from '@/types/chart';

interface ChartWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  { id: 1, title: 'Tipo de Gráfico', description: 'Escolha o tipo de análise' },
  { id: 2, title: 'Configuração', description: 'Configure os dados' },
  { id: 3, title: 'Personalização', description: 'Customize a aparência' },
  { id: 4, title: 'Revisão', description: 'Revise e crie' }
];

export default function ChartWizardModal({ isOpen, onClose }: ChartWizardModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({
    step1: { chart_type: 'evolution' },
    step2: {},
    step3: {
      name: '',
      color: '#3B82F6',
      show_values_on_points: true,
      show_percentages: true,
      show_trend_line: false,
      highlight_min_max: false
    }
  });

  const resetWizard = () => {
    setCurrentStep(1);
    setWizardData({
      step1: { chart_type: 'evolution' },
      step2: {},
      step3: {
        name: '',
        color: '#3B82F6',
        show_values_on_points: true,
        show_percentages: true,
        show_trend_line: false,
        highlight_min_max: false
      }
    });
  };

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateStep1Data = (data: WizardStep1Data) => {
    setWizardData(prev => ({ ...prev, step1: data }));
  };

  const updateStep2Data = (data: WizardStep2Data) => {
    setWizardData(prev => ({ ...prev, step2: data }));
  };

  const updateStep3Data = (data: WizardStep3Data) => {
    setWizardData(prev => ({ ...prev, step3: data }));
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return wizardData.step1.chart_type !== undefined;
      case 2:
        return true; // Simplified validation for step 2
      case 3:
        return wizardData.step3.name.trim() !== '';
      default:
        return true;
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1ChartTypeSelection
            data={wizardData.step1}
            onUpdate={updateStep1Data}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <Step2DataConfiguration
            chartType={wizardData.step1.chart_type}
            data={wizardData.step2}
            onUpdate={updateStep2Data}
          />
        );
      case 3:
        return (
          <Step3VisualCustomization
            chartType={wizardData.step1.chart_type}
            data={wizardData.step3}
            step2Data={wizardData.step2}
            onUpdate={updateStep3Data}
          />
        );
      case 4:
        return (
          <Step4ReviewAndCreate
            wizardData={wizardData}
            onClose={handleClose}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-semibold">
            Criar Novo Gráfico - Passo {currentStep} de {STEPS.length}
          </DialogTitle>
        </DialogHeader>

        {/* Simplified Progress indicator */}
        <div className="flex items-center justify-center mb-4">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    currentStep >= step.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.id}
                </div>
                <div className="mt-1 text-center">
                  <div className={`text-xs font-medium ${
                    currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </div>
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`w-12 h-0.5 mx-3 mt-4 transition-colors ${
                  currentStep > step.id ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 px-1">
          {renderCurrentStep()}
        </div>

        {/* Navigation buttons - only show for steps 2 and 3 */}
        {currentStep >= 2 && currentStep <= 3 && (
          <div className="flex justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceedToNext()}
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
