import { ImportStep, LayoutType } from '@/types/import';

// String union types expected by UI components
export type StepperStepString =
  | 'upload'
  | 'identify'
  | 'duplicate-analysis'
  | 'processing'
  | 'categorization'
  | 'completion'
  | 'manual-selection';

export type LayoutTypeString = 'bank' | 'credit_card' | null;

/**
 * Map ImportStep enum to the string literals expected by ImportStepper
 */
export function mapImportStepToStepperStep(step: ImportStep): StepperStepString {
  switch (step) {
    case ImportStep.UPLOAD:
      return 'upload';
    case ImportStep.IDENTIFICATION:
      return 'identify';
    case ImportStep.DUPLICATE_ANALYSIS:
      return 'duplicate-analysis';
    case ImportStep.PROCESSING:
      return 'processing';
    case ImportStep.CATEGORIZATION:
      return 'categorization';
    case ImportStep.COMPLETION:
      return 'completion';
    case ImportStep.MANUAL_SELECTION:
      return 'manual-selection';
    default:
      return 'upload';
  }
}

/**
 * Map LayoutType enum to simple string identifier used across UI
 */
export function mapLayoutTypeToString(type: LayoutType | null): LayoutTypeString {
  if (!type) return null;
  switch (type) {
    case LayoutType.BANK:
      return 'bank';
    case LayoutType.CREDIT_CARD:
      return 'credit_card';
    default:
      return null;
  }
}