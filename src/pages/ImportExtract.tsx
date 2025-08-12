import React, { useState, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { getLogger } from '@/utils/logger';

const logger = getLogger('ImportExtract');
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import CSVUploader from '@/components/CSVUploader';
import TransactionImportTable from '@/components/TransactionImportTable';
import DuplicateAnalysisCard from '@/components/DuplicateAnalysisCard';
import ImportResultsCard from '@/components/ImportResultsCard';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { BankSelector } from '@/components/BankSelector';
import { CreditCardGridSelector } from '@/components/CreditCardGridSelector';
import { ImportStepper } from '@/components/ImportStepper';
import { supabase } from '@/integrations/supabase/client';
import { useImportOrchestration } from '@/hooks/useImportOrchestration';
import { useImportStrategies } from '@/hooks/useImportStrategies';
import { 
  ImportStep, 
  LayoutType,
  ParsedTransaction
} from '@/types/import';
import type { CreditCard } from '@/types/creditCard';
import { mapImportStepToStepperStep, mapLayoutTypeToString } from '@/utils/importMappers';

export default function ImportExtract() {
  // Use orchestration hook for all state management
  const {
    currentStep,
    isProcessing,
    processingProgress,
    currentProcessingMessage,
    currentProcessingSubMessage,
    transactions,
    duplicateAnalysis,
    importSession,
    selectedBank,
    selectedCreditCardId,
    layoutType,
    selectedImportMode,
    setCurrentStep,
    setTransactions,
    setSelectedBank,
    setSelectedCreditCardId,
    setImportSession,
    handleDataParsed,
    handleDuplicateAnalysisComplete,
    resetFlow,
    updateProcessingState
  } = useImportOrchestration();

  // Use strategies hook for import operations
  const {
    importBankTransactions,
    importCreditCardTransactions,
    runAICategorization
  } = useImportStrategies();

  // Local states for UI-specific functionality
  const [importResults, setImportResults] = useState<{
    successful: number;
    failed: number;
    skipped: number;
    updated: number;
    total: number;
    errors: string[];
  } | null>(null);
  const [useBackgroundProcessing, setUseBackgroundProcessing] = useState(false);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loadingCreditCards, setLoadingCreditCards] = useState(false);
  const { toast } = useToast();

  // Session storage utilities
  const loadSessionFromStorage = () => {
    try {
      const stored = localStorage.getItem('currentImportSession');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      logger.error('Error loading session from storage', { error });
      return null;
    }
  };

  const clearSessionFromStorage = () => {
    localStorage.removeItem('currentImportSession');
  };

  // Load session from storage on component mount
  useEffect(() => {
    const storedSession = loadSessionFromStorage();
    if (storedSession) {
      logger.info('Loaded session from storage', { sessionId: storedSession.id });
      setImportSession(storedSession);
    }
  }, [setImportSession]);

  // Check authentication status
  const checkAuthentication = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      logger.error('Error checking authentication', { error });
      toast({
        title: "Erro de autenticação",
        description: "Não foi possível verificar a autenticação. Por favor, faça login novamente.",
        variant: "destructive"
      });
      return false;
    }

    if (!user) {
      logger.warn('User not authenticated');
      toast({
        title: "Não autenticado",
        description: "Por favor, faça login para importar transações.",
        variant: "destructive"
      });
      return false;
    }

    logger.info('User authenticated', { userId: user.id });
    return true;
  };

  // Reset credit card selection when bank changes
  useEffect(() => {
    if (layoutType === LayoutType.CREDIT_CARD) {
      setSelectedCreditCardId('');
    }
  }, [selectedBank, layoutType, setSelectedCreditCardId]);

  // Load credit cards when identification step is reached for credit_card layout
  useEffect(() => {
    const loadCreditCards = async () => {
      if (currentStep === ImportStep.IDENTIFICATION && layoutType === LayoutType.CREDIT_CARD && selectedBank) {
        setLoadingCreditCards(true);
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: creditCardsData, error } = await supabase
            .from('credit_cards')
            .select('*')
            .eq('user_id', user.id)
            .eq('bank_id', selectedBank)
            .eq('is_archived', false)
            .order('description');

          if (error) {
            logger.error('Error loading credit cards', { error });
            toast({
              title: "Erro ao carregar cartões",
              description: "Não foi possível carregar os cartões de crédito",
              variant: "destructive"
            });
            return;
          }

          setCreditCards(creditCardsData || []);
        } catch (error) {
          logger.error('Error loading credit cards', { error });
        } finally {
          setLoadingCreditCards(false);
        }
      }
    };

    loadCreditCards();
  }, [currentStep, layoutType, selectedBank, toast]);

  // Handler for CSV data parsing
  const handleCSVDataParsed = async (parsedTransactions: ParsedTransaction[], layoutType: 'bank' | 'credit_card', bankId: string, useBackgroundProcessing?: boolean) => {
    logger.info('Import process started', { 
      transactionCount: parsedTransactions.length, 
      layoutType, 
      bankId, 
      useBackgroundProcessing 
    });
    
    // Store background processing preference
    if (useBackgroundProcessing !== undefined) {
      setUseBackgroundProcessing(useBackgroundProcessing);
    }
    
    // Convert string literals to enum types
    const convertedLayoutType = layoutType === 'credit_card' ? LayoutType.CREDIT_CARD : LayoutType.BANK;
    
    // Delegate to orchestration hook
    await handleDataParsed(parsedTransactions, convertedLayoutType, bankId, useBackgroundProcessing);
    
    // After data is parsed, move to identification step
    setCurrentStep(ImportStep.IDENTIFICATION);
  };

  const handleIdentificationComplete = async () => {
    // Validate selections
    if (!selectedBank) {
      toast({
        title: "Seleção Necessária",
        description: "Por favor, selecione um banco para continuar.",
        variant: "destructive"
      });
      return;
    }

    if (layoutType === LayoutType.CREDIT_CARD && !selectedCreditCardId) {
      toast({
        title: "Seleção Necessária",
        description: "Por favor, selecione um cartão de crédito para continuar.",
        variant: "destructive"
      });
      return;
    }

    // Check authentication first
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
      return;
    }

    try {
      updateProcessingState(10, 'Iniciando processamento', 'Validando dados...');

      if (layoutType === LayoutType.CREDIT_CARD) {
        // Delegate credit card processing to strategies hook
        const user = await supabase.auth.getUser().then(res => res.data.user);
        await runAICategorization(
          transactions,
          user,
          {
            setIsProcessing: () => {},
            setProcessingProgress: (progress: number) => updateProcessingState(progress, currentProcessingMessage),
            setCurrentProcessingMessage: (msg: string) => updateProcessingState(processingProgress, msg),
            setCurrentProcessingSubMessage: (msg: string) => updateProcessingState(processingProgress, currentProcessingMessage, msg)
          },
          'credit_card'
        );
        
        setCurrentStep(ImportStep.CATEGORIZATION);
      } else {
        // For bank transactions, proceed with normal flow
        setCurrentStep(ImportStep.CATEGORIZATION);
      }
    } catch (error) {
      logger.error('Error in identification completion', { error });
      toast({
        title: "Erro no processamento",
        description: "Ocorreu um erro ao processar as transações",
        variant: "destructive"
      });
      setCurrentStep(ImportStep.UPLOAD);
    }
  };

  const handleImportStart = async () => {
    if (!selectedBank) {
      toast({
        title: "Seleção necessária",
        description: "Por favor, selecione um banco antes de importar.",
        variant: "destructive"
      });
      return;
    }

    const selectedTransactions = transactions.filter(t => t.selected);
    if (selectedTransactions.length === 0) {
      toast({
        title: "Nenhuma transação selecionada",
        description: "Por favor, selecione pelo menos uma transação para importar.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      let result;
      if (layoutType === LayoutType.CREDIT_CARD) {
        result = await importCreditCardTransactions(
          selectedTransactions,
          selectedBank,
          selectedCreditCardId,
          importSession!,
          user,
          {
            setIsProcessing: () => {},
            setProcessingProgress: (progress: number) => updateProcessingState(progress, currentProcessingMessage),
            setCurrentProcessingMessage: (msg: string) => updateProcessingState(processingProgress, msg),
            setCurrentProcessingSubMessage: (msg: string) => updateProcessingState(processingProgress, currentProcessingMessage, msg)
          }
        );
      } else {
        result = await importBankTransactions(
          selectedTransactions,
          selectedBank,
          importSession!,
          user,
          {
            setIsProcessing: () => {},
            setProcessingProgress: (progress: number) => updateProcessingState(progress, currentProcessingMessage),
            setCurrentProcessingMessage: (msg: string) => updateProcessingState(processingProgress, msg),
            setCurrentProcessingSubMessage: (msg: string) => updateProcessingState(processingProgress, currentProcessingMessage, msg)
          }
        );
      }

      if (result.success) {
        setImportResults({
          successful: result.total,
          failed: 0,
          skipped: 0,
          updated: 0,
          total: result.total,
          errors: []
        });
        setCurrentStep(ImportStep.COMPLETION);
        clearSessionFromStorage();
      }
    } catch (error) {
      logger.error('Error in import', { error });
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro ao importar as transações",
        variant: "destructive"
      });
    }
  };

  const handleReset = () => {
    resetFlow();
    setImportResults(null);
    setUseBackgroundProcessing(false);
    setCreditCards([]);
    setLoadingCreditCards(false);
    clearSessionFromStorage();
  };

  const handleGoToManualSelection = () => {
    setCurrentStep(ImportStep.MANUAL_SELECTION);
  };

  const handleBankSelection = (bankId: string) => {
    setSelectedBank(bankId);
    setCurrentStep(ImportStep.UPLOAD);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importar Transações</h1>
          <p className="text-muted-foreground">
            Importe suas transações de arquivos CSV ou OFX
          </p>
        </div>
        
        {currentStep !== ImportStep.UPLOAD && (
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Nova Importação
          </Button>
        )}
      </div>

      {/* Progress indicator */}
      <ImportStepper 
         currentStep={mapImportStepToStepperStep(currentStep)} 
         layoutType={mapLayoutTypeToString(layoutType)} 
      />

      {/* Loading overlay during processing */}
      {isProcessing && (
        <LoadingOverlay
          isVisible={isProcessing}
          message={currentProcessingMessage || 'Processando...'}
          subMessage={currentProcessingSubMessage}
          progress={processingProgress}
        />
      )}

      {/* Main content */}
      <div className="space-y-6">
        {/* Upload step */}
        {currentStep === ImportStep.UPLOAD && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload de Arquivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CSVUploader
                onDataParsed={handleCSVDataParsed}
                onError={(error) => {
                  toast({
                    title: "Erro no upload",
                    description: error,
                    variant: "destructive"
                  });
                }}
                selectedBankId={selectedBank}
                useBackgroundProcessing={useBackgroundProcessing}
                setUseBackgroundProcessing={setUseBackgroundProcessing}
              />
              
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Não consegue identificar automaticamente?
                </p>
                <Button variant="outline" onClick={handleGoToManualSelection}>
                  Selecionar Banco Manualmente
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manual bank selection step */}
        {currentStep === ImportStep.MANUAL_SELECTION && (
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Banco</CardTitle>
            </CardHeader>
            <CardContent>
              <BankSelector
                value={selectedBank}
                onValueChange={handleBankSelection}
              />
            </CardContent>
          </Card>
        )}

        {/* Identification step */}
        {currentStep === ImportStep.IDENTIFICATION && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Identificar Origem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bank selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Banco/Instituição Financeira
                </label>
                <BankSelector
                  value={selectedBank}
                  onValueChange={setSelectedBank}
                />
              </div>

              {/* Credit card selection for credit card layout */}
              {layoutType === LayoutType.CREDIT_CARD && selectedBank && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Cartão de Crédito
                  </label>
                  {loadingCreditCards ? (
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        Carregando cartões...
                      </span>
                    </div>
                  ) : (
                    <CreditCardGridSelector
                      creditCards={creditCards}
                      selectedCreditCardId={selectedCreditCardId}
                      onSelect={setSelectedCreditCardId}
                      loading={loadingCreditCards}
                    />
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(ImportStep.UPLOAD)}
                >
                  Voltar
                </Button>
                <Button onClick={handleIdentificationComplete}>
                  Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Duplicate analysis step */}
        {currentStep === ImportStep.DUPLICATE_ANALYSIS && duplicateAnalysis && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Análise de Duplicatas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DuplicateAnalysisCard
                duplicates={duplicateAnalysis.duplicates}
                newTransactions={duplicateAnalysis.newTransactions}
                selectedMode={selectedImportMode}
                onModeChange={(mode) => {/* Handle mode change if needed */}}
                onComplete={handleDuplicateAnalysisComplete}
              />
            </CardContent>
          </Card>
        )}

        {/* Categorization step */}
        {currentStep === ImportStep.CATEGORIZATION && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Revisar e Categorizar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionImportTable
                transactions={transactions}
                onTransactionsUpdate={setTransactions}
                layoutType={mapLayoutTypeToString(layoutType)}
                useBackgroundProcessing={useBackgroundProcessing}
              />
              
              <div className="mt-6 flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(ImportStep.UPLOAD)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleImportStart}>
                  Importar Selecionadas
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completion step */}
        {currentStep === ImportStep.COMPLETION && importResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Importação Concluída
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ImportResultsCard result={importResults} onClose={handleReset} />
              
              <div className="mt-6 flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                >
                  Nova Importação
                </Button>
                <Button
                  onClick={() => {
                    window.location.href = '/transactions';
                  }}
                >
                  Ver Transações
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
