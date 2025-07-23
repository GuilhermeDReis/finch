
import React, { useState, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import CSVUploader from '@/components/CSVUploader';
import TransactionImportTable from '@/components/TransactionImportTable';
import DuplicateAnalysisCard from '@/components/DuplicateAnalysisCard';
import ImportResultsCard from '@/components/ImportResultsCard';
import LoadingOverlay from '@/components/LoadingOverlay';
import { supabase } from '@/integrations/supabase/client';
import { detectDuplicates } from '@/services/duplicateDetection';
import type { TransactionRow, RefundedTransaction, UnifiedPixTransaction } from '@/types/transaction';

interface ImportSession {
  id: string;
  filename: string;
  total_records: number;
  processed_records: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export default function ImportExtract() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [refundedTransactions, setRefundedTransactions] = useState<RefundedTransaction[]>([]);
  const [unifiedPixTransactions, setUnifiedPixTransactions] = useState<UnifiedPixTransaction[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'duplicate-analysis' | 'review' | 'processing' | 'results'>('upload');
  const [importSession, setImportSession] = useState<ImportSession | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [existingTransactions, setExistingTransactions] = useState<any[]>([]);
  const [duplicateAnalysis, setDuplicateAnalysis] = useState<{
    duplicates: any[];
    newTransactions: TransactionRow[];
  } | null>(null);
  const { toast } = useToast();

  const handleDataParsed = async (parsedTransactions: TransactionRow[]) => {
    console.log('📊 [IMPORT] handleDataParsed called with:', parsedTransactions.length, 'transactions');
    
    try {
      // Load existing transactions for duplicate detection
      const { data: existingData, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('❌ [IMPORT] Error loading existing transactions:', error);
        toast({
          title: "Erro ao carregar transações",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      setExistingTransactions(existingData || []);
      
      // Detect duplicates, refunds, and unified PIX
      const duplicateResults = detectDuplicates(parsedTransactions, existingData || []);
      
      console.log('🔍 [IMPORT] Duplicate detection results:', {
        duplicates: duplicateResults.duplicates.length,
        refunds: duplicateResults.refundedTransactions.length,
        unifiedPix: duplicateResults.unifiedPixTransactions.length,
        newTransactions: duplicateResults.newTransactions.length
      });

      setRefundedTransactions(duplicateResults.refundedTransactions);
      setUnifiedPixTransactions(duplicateResults.unifiedPixTransactions);
      setDuplicateAnalysis(duplicateResults);

      // Check if we have any issues that require user attention
      const hasIssues = duplicateResults.duplicates.length > 0 || 
                       duplicateResults.refundedTransactions.length > 0 || 
                       duplicateResults.unifiedPixTransactions.length > 0;

      if (hasIssues) {
        console.log('⚠️ [IMPORT] Issues detected, showing duplicate analysis screen');
        setCurrentStep('duplicate-analysis');
      } else {
        console.log('✅ [IMPORT] No issues detected, proceeding to AI categorization');
        setTransactions(duplicateResults.newTransactions);
        
        // Proceed directly to AI categorization
        await handleAICategorization(duplicateResults.newTransactions);
      }

    } catch (error) {
      console.error('💥 [IMPORT] Exception in handleDataParsed:', error);
      toast({
        title: "Erro no processamento",
        description: "Ocorreu um erro ao processar as transações",
        variant: "destructive"
      });
    }
  };

  const handleAICategorization = async (transactionsToProcess: TransactionRow[]) => {
    console.log('🤖 [AI] Starting AI categorization for', transactionsToProcess.length, 'transactions');
    
    setIsProcessing(true);
    setProcessingProgress(0);
    setCurrentStep('processing');

    try {
      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('import_sessions')
        .insert({
          filename: 'import_' + Date.now(),
          total_records: transactionsToProcess.length,
          status: 'processing'
        })
        .select()
        .single();

      if (sessionError) {
        console.error('❌ [AI] Error creating import session:', sessionError);
        throw sessionError;
      }

      setImportSession(session);

      // Process with AI categorization
      const { data: categorizedTransactions, error: aiError } = await supabase.functions.invoke('gemini-categorize-transactions', {
        body: { transactions: transactionsToProcess }
      });

      if (aiError) {
        console.error('❌ [AI] Error in AI categorization:', aiError);
        throw aiError;
      }

      console.log('✅ [AI] AI categorization completed successfully');
      
      // Update transactions with AI suggestions
      const updatedTransactions = transactionsToProcess.map(transaction => {
        const aiSuggestion = categorizedTransactions?.find((cat: any) => cat.id === transaction.id);
        return {
          ...transaction,
          categoryId: aiSuggestion?.categoryId || transaction.categoryId,
          subcategoryId: aiSuggestion?.subcategoryId || transaction.subcategoryId,
          aiSuggestion: aiSuggestion ? {
            categoryId: aiSuggestion.categoryId,
            confidence: aiSuggestion.confidence,
            reasoning: aiSuggestion.reasoning,
            isAISuggested: true
          } : undefined
        };
      });

      setTransactions(updatedTransactions);
      setProcessingProgress(100);
      setCurrentStep('review');

    } catch (error) {
      console.error('💥 [AI] Exception in AI categorization:', error);
      
      // Update session with error
      if (importSession) {
        await supabase
          .from('import_sessions')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', importSession.id);
      }

      toast({
        title: "Erro na categorização",
        description: "Ocorreu um erro ao categorizar as transações com IA",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDuplicateAnalysisComplete = async (
    selectedTransactions: TransactionRow[],
    action: 'import' | 'skip' | 'overwrite'
  ) => {
    console.log('🔄 [DUPLICATE] handleDuplicateAnalysisComplete called:', {
      selectedCount: selectedTransactions.length,
      action
    });

    if (action === 'skip') {
      setCurrentStep('upload');
      return;
    }

    // Continue with AI categorization
    await handleAICategorization(selectedTransactions);
  };

  const handleTransactionsUpdate = (updatedTransactions: TransactionRow[]) => {
    console.log('🔄 [UPDATE] handleTransactionsUpdate called with:', updatedTransactions.length, 'transactions');
    setTransactions(updatedTransactions);
  };

  const handleFinalImport = async () => {
    console.log('💾 [FINAL] handleFinalImport called');
    
    if (!importSession) {
      toast({
        title: "Erro",
        description: "Sessão de importação não encontrada",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      // Prepare transactions for final import
      const transactionsToImport = transactions.map(transaction => ({
        ...transaction,
        import_session_id: importSession.id,
        user_id: undefined // Will be set by RLS
      }));

      console.log('💾 [FINAL] Importing', transactionsToImport.length, 'transactions');

      // Import to database
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionsToImport)
        .select();

      if (error) {
        console.error('❌ [FINAL] Error importing transactions:', error);
        throw error;
      }

      // Update session
      await supabase
        .from('import_sessions')
        .update({
          status: 'completed',
          processed_records: transactionsToImport.length,
          completed_at: new Date().toISOString()
        })
        .eq('id', importSession.id);

      setImportResults({
        imported: transactionsToImport.length,
        skipped: 0,
        errors: []
      });

      setProcessingProgress(100);
      setCurrentStep('results');

      toast({
        title: "Importação concluída",
        description: `${transactionsToImport.length} transações importadas com sucesso`,
        variant: "default"
      });

    } catch (error) {
      console.error('💥 [FINAL] Exception in final import:', error);
      
      await supabase
        .from('import_sessions')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', importSession.id);

      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro ao importar as transações",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetImport = () => {
    setTransactions([]);
    setRefundedTransactions([]);
    setUnifiedPixTransactions([]);
    setCurrentStep('upload');
    setImportSession(null);
    setIsProcessing(false);
    setProcessingProgress(0);
    setImportResults(null);
    setExistingTransactions([]);
    setDuplicateAnalysis(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Importar Extrato</h1>
        {currentStep !== 'upload' && (
          <Button variant="outline" onClick={resetImport}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Nova Importação
          </Button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center space-x-4 mb-6">
        <div className={`flex items-center ${currentStep === 'upload' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            1
          </div>
          <span className="ml-2">Upload</span>
        </div>
        
        <div className="flex-1 h-px bg-border" />
        
        <div className={`flex items-center ${currentStep === 'duplicate-analysis' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'duplicate-analysis' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            2
          </div>
          <span className="ml-2">Análise</span>
        </div>
        
        <div className="flex-1 h-px bg-border" />
        
        <div className={`flex items-center ${currentStep === 'processing' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'processing' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            3
          </div>
          <span className="ml-2">Processamento</span>
        </div>
        
        <div className="flex-1 h-px bg-border" />
        
        <div className={`flex items-center ${currentStep === 'review' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'review' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            4
          </div>
          <span className="ml-2">Revisão</span>
        </div>
        
        <div className="flex-1 h-px bg-border" />
        
        <div className={`flex items-center ${currentStep === 'results' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'results' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            5
          </div>
          <span className="ml-2">Resultados</span>
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 'upload' && (
        <CSVUploader onDataParsed={handleDataParsed} />
      )}

      {currentStep === 'duplicate-analysis' && duplicateAnalysis && (
        <DuplicateAnalysisCard
          duplicates={duplicateAnalysis.duplicates}
          newTransactions={duplicateAnalysis.newTransactions}
          refundedTransactions={refundedTransactions}
          unifiedPixTransactions={unifiedPixTransactions}
          onComplete={handleDuplicateAnalysisComplete}
        />
      )}

      {currentStep === 'processing' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Processando Transações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>Categorizando com IA...</span>
                  <span>{processingProgress}%</span>
                </div>
                <Progress value={processingProgress} className="w-full" />
              </div>
              
              {importSession && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    Sessão: {importSession.id.substring(0, 8)}
                  </Badge>
                  <Badge variant="outline">
                    {importSession.total_records} transações
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'review' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Revisar Transações</h2>
            <Button onClick={handleFinalImport} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Importar Transações
                </>
              )}
            </Button>
          </div>
          
          <TransactionImportTable
            transactions={transactions}
            refundedTransactions={refundedTransactions}
            unifiedPixTransactions={unifiedPixTransactions}
            onTransactionsUpdate={handleTransactionsUpdate}
          />
        </div>
      )}

      {currentStep === 'results' && importResults && (
        <ImportResultsCard
          results={importResults}
          onNewImport={resetImport}
        />
      )}

      {/* Loading Overlay */}
      {isProcessing && <LoadingOverlay />}
    </div>
  );
}
