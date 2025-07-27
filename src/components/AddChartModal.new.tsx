import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Step1ChartTypeSelection from './wizard/Step1ChartTypeSelection';
import Step2DataConfiguration from './wizard/Step2DataConfiguration';
import Step3VisualCustomization from './wizard/Step3VisualCustomization';
import Step4ReviewAndCreate from './wizard/Step4ReviewAndCreate';
import type { ChartFormData } from '@/types/chart';

interface AddChartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddChartModal({ isOpen, onClose }: AddChartModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ChartFormData>({
    name: '',
    category_id: '',
    monthly_goal: '',
    color: '#3b82f6',
    period_months: 12,
    transaction_type: 'expense',
    grouping_type: 'category',
    chart_type: 'evolution',
    show_values_on_points: true,
    show_percentages: true,
    show_trend_line: false,
    highlight_min_max: false,
    visual_options: {}
  });

  const updateFormData = (updates: Partial<ChartFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

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
    setFormData({
      name: '',
      category_id: '',
      monthly_goal: '',
      color: '#3b82f6',
      period_months: 12,
      transaction_type: 'expense',
      grouping_type: 'category',
      chart_type: 'evolution',
      show_values_on_points: true,
      show_percentages: true,
      show_trend_line: false,
      highlight_min_max: false,
      visual_options: {}
    });
    onClose();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1ChartTypeSelection formData={formData} updateFormData={updateFormData} />;
      case 2:
        return <Step2DataConfiguration formData={formData} updateFormData={updateFormData} />;
      case 3:
        return <Step3VisualCustomization formData={formData} updateFormData={updateFormData} />;
      case 4:
        return <Step4ReviewAndCreate formData={formData} onClose={handleClose} />;
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
        {/* Header with step indicator */}
        <div className="border-b pb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Criar Novo Gráfico</h2>
            <div className="text-sm text-muted-foreground">
              Passo {currentStep} de 4
            </div>
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
