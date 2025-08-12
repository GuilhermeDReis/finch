import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { detectDuplicates } from '@/services/duplicateDetection';
import { createUnifiedTransactions, createUnifiedTransactionsForDuplicateAnalysis, validateUnifiedTransactions } from '@/utils/transactionUnification';
import type { TransactionRow } from '@/types/transaction';
import { 
  ImportStep, 
  ImportMode, 
  ParsedTransaction, 
  ImportSession, 
  DuplicateAnalysis,
  TransactionType,
  LayoutType
} from '@/types/import';
import type { ExistingTransaction } from '@/services/duplicateDetection';
import { getLogger } from '@/utils/logger';

const logger = getLogger('useImportOrchestration');

/**
 * Hook central para orquestração do fluxo de importação
 * Gerencia estado e coordena os passos do processo
 */
export function useImportOrchestration() {
  const { toast } = useToast();

  // Flow state
  const [currentStep, setCurrentStep] = useState<ImportStep>(ImportStep.UPLOAD);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentProcessingMessage, setCurrentProcessingMessage] = useState('');
  const [currentProcessingSubMessage, setCurrentProcessingSubMessage] = useState('');
  
  // Data state
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [existingTransactions, setExistingTransactions] = useState<ExistingTransaction[]>([]);
  const [duplicateAnalysis, setDuplicateAnalysis] = useState<DuplicateAnalysis | null>(null);
  const [importSession, setImportSession] = useState<ImportSession | null>(null);
  
  // Selection state
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [selectedCreditCardId, setSelectedCreditCardId] = useState<string>('');
  const [layoutType, setLayoutType] = useState<LayoutType | null>(null);
  const [selectedImportMode, setSelectedImportMode] = useState<ImportMode>(ImportMode.NEW_ONLY);

  /**
   * Handles parsed data from CSV upload
   */
  const handleDataParsed = useCallback(async (
    parsedTransactions: ParsedTransaction[], 
    detectedLayoutType: LayoutType, 
    bankId: string, 
    useBackgroundProcessing?: boolean
  ) => {
    try {
      logger.info('Processing parsed data', {
        transactionCount: parsedTransactions.length,
        layoutType: detectedLayoutType,
        bankId,
        useBackground: useBackgroundProcessing
      });

      setIsProcessing(true);
      setProcessingProgress(10);
      setCurrentProcessingMessage('Processando transações...');
      setCurrentProcessingSubMessage('Convertendo dados CSV...');

      // Convert parsed transactions to TransactionRow format
      const transactionRows: TransactionRow[] = parsedTransactions.map(tx => ({
        ...tx,
        selected: true,
        status: 'normal' as const,
        originalDescription: tx.originalDescription || tx.description,
        editedDescription: tx.description,
        isEditing: false
      }));

      setTransactions(transactionRows);
      setLayoutType(detectedLayoutType);
      setSelectedBank(bankId);

      setProcessingProgress(30);
      setCurrentProcessingSubMessage('Carregando transações existentes...');

      // Load existing transactions for duplicate detection
      const tableName = detectedLayoutType === LayoutType.CREDIT_CARD ? 'transaction_credit' : 'transactions';
      const { data: existing, error: existingError } = await supabase
        .from(tableName)
        .select('*')
        .eq('bank_id', bankId)
        .order('date', { ascending: false });

      if (existingError) {
        throw existingError;
      }

      setExistingTransactions((existing as ExistingTransaction[]) || []);
      setProcessingProgress(50);
      setCurrentProcessingSubMessage('Detectando duplicatas...');

      // Detect duplicates and create unified transactions
      const duplicateResults = detectDuplicates(transactionRows, (existing as ExistingTransaction[]) || []);
      const unifiedTransactions = createUnifiedTransactions(duplicateResults);

      // Validate unified transactions
      const validation = validateUnifiedTransactions(unifiedTransactions);
      if (!validation.isValid) {
        logger.warn('Validation warnings in unified transactions', { 
          errors: validation.errors,
          warnings: validation.warnings 
        });
      }

      setProcessingProgress(70);

      // Check if we have duplicates that require user attention
      const hasDuplicates = duplicateResults.duplicates.length > 0;

      if (hasDuplicates) {
        logger.info('Duplicates detected, showing analysis screen');
        setDuplicateAnalysis({
          duplicates: duplicateResults.duplicates,
          newTransactions: duplicateResults.newTransactions
        });
        setCurrentStep(ImportStep.DUPLICATE_ANALYSIS);
      } else {
        logger.info('No duplicates detected, proceeding with unified transactions');
        setTransactions(unifiedTransactions);
        setCurrentStep(ImportStep.CATEGORIZATION);
      }

      setProcessingProgress(100);
    } catch (error) {
      logger.error('Error in handleDataParsed', { error });
      toast({
        title: "Erro no processamento",
        description: "Ocorreu um erro ao processar as transações",
        variant: "destructive"
      });
      setCurrentStep(ImportStep.UPLOAD);
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  /**
   * Handles completion of duplicate analysis
   */
  const handleDuplicateAnalysisComplete = useCallback(async (
    selectedTransactions: TransactionRow[],
    action: 'import' | 'skip' | 'overwrite'
  ) => {
    try {
      logger.info('Processing duplicate analysis result', {
        selectedCount: selectedTransactions.length,
        action
      });

      if (action === 'skip') {
        setCurrentStep(ImportStep.UPLOAD);
        return;
      }

      if (!duplicateAnalysis) {
        throw new Error('No duplicate analysis data available');
      }

      // Re-detect duplicates to get fresh pairs data
      const duplicateResults = detectDuplicates(selectedTransactions, existingTransactions);
      
      // Create unified transactions based on action
      const unifiedTransactions = createUnifiedTransactionsForDuplicateAnalysis(
        duplicateResults, 
        selectedTransactions, 
        action
      );

      setTransactions(unifiedTransactions);
      setCurrentStep(ImportStep.CATEGORIZATION);

    } catch (error) {
      logger.error('Error in handleDuplicateAnalysisComplete', { error });
      toast({
        title: "Erro no processamento",
        description: "Ocorreu um erro ao processar a análise de duplicatas",
        variant: "destructive"
      });
    }
  }, [duplicateAnalysis, existingTransactions, toast]);

  /**
   * Resets the import flow
   */
  const resetFlow = useCallback(() => {
    setCurrentStep(ImportStep.UPLOAD);
    setIsProcessing(false);
    setProcessingProgress(0);
    setCurrentProcessingMessage('');
    setCurrentProcessingSubMessage('');
    setTransactions([]);
    setExistingTransactions([]);
    setDuplicateAnalysis(null);
    setImportSession(null);
    setSelectedBank('');
    setSelectedCreditCardId('');
    setLayoutType(null);
    setSelectedImportMode(ImportMode.NEW_ONLY);
  }, []);

  /**
   * Updates processing state
   */
  const updateProcessingState = useCallback((
    progress: number,
    message: string,
    subMessage?: string
  ) => {
    setProcessingProgress(progress);
    setCurrentProcessingMessage(message);
    if (subMessage) {
      setCurrentProcessingSubMessage(subMessage);
    }
  }, []);

  return {
    // State
    currentStep,
    isProcessing,
    processingProgress,
    currentProcessingMessage,
    currentProcessingSubMessage,
    transactions,
    existingTransactions,
    duplicateAnalysis,
    importSession,
    selectedBank,
    selectedCreditCardId,
    layoutType,
    selectedImportMode,

    // Actions
    setCurrentStep,
    setTransactions,
    setSelectedBank,
    setSelectedCreditCardId,
    setLayoutType,
    setSelectedImportMode,
    setImportSession,
    
    // Handlers
    handleDataParsed,
    handleDuplicateAnalysisComplete,
    resetFlow,
    updateProcessingState
  };
}