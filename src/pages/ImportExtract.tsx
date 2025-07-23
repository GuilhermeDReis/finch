
import React, { useState } from 'react';
import { Upload, FileText, Save, X, Trash2, Bot, Loader2, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import CSVUploader from '@/components/CSVUploader';
import TransactionImportTable from '@/components/TransactionImportTable';
import DuplicateAnalysisCard, { ImportMode } from '@/components/DuplicateAnalysisCard';
import ImportResultsCard from '@/components/ImportResultsCard';
import { BelvoConnectWidget } from '@/components/BelvoConnectWidget';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { supabase } from '@/integrations/supabase/client';
import { analyzeDuplicates, type DuplicateAnalysis } from '@/services/duplicateDetection';
import type { TransactionRow } from '@/types/transaction';

type ImportStep = 'upload' | 'duplicate-analysis' | 'categorization' | 'results';

export default function ImportExtract() {
  const [importedData, setImportedData] = useState<TransactionRow[]>([]);
  const [processedData, setProcessedData] = useState<TransactionRow[]>([]);
  const [duplicateAnalysis, setDuplicateAnalysis] = useState<DuplicateAnalysis | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('new-only');
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [importResults, setImportResults] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isAnalyzingDuplicates, setIsAnalyzingDuplicates] = useState(false);
  const [filename, setFilename] = useState('');
  const { toast } = useToast();

  const handleDataParsed = async (data: TransactionRow[]) => {
    console.log('🔍 [DEBUG] handleDataParsed called with data:', {
      length: data.length,
      firstTransaction: data[0],
      allTransactions: data
    });
    
    setImportedData(data);
    setIsAnalyzingDuplicates(true);
    
    try {
      // Analyze duplicates
      const analysis = await analyzeDuplicates(data);
      setDuplicateAnalysis(analysis);
      setCurrentStep('duplicate-analysis');
      
      toast({
        title: "Arquivo processado",
        description: `${data.length} transações analisadas - ${analysis.totalNew} novas, ${analysis.totalDuplicates} duplicatas`,
      });
    } catch (error) {
      console.error('Error analyzing duplicates:', error);
      toast({
        variant: "destructive",
        title: "Erro na análise",
        description: "Falha ao analisar duplicatas, prosseguindo com importação normal",
      });
      // Fallback to normal flow
      setProcessedData(data.map(t => ({ ...t, selected: false })));
      setCurrentStep('categorization');
      await processWithAI(data);
    } finally {
      setIsAnalyzingDuplicates(false);
    }
  };

  const handleError = (error: string) => {
    toast({
      variant: "destructive",
      title: "Erro no processamento",
      description: error,
    });
  };

  const handleDuplicateAnalysisProceed = async () => {
    if (!duplicateAnalysis) return;

    let dataToProcess: TransactionRow[] = [];
    
    switch (importMode) {
      case 'new-only':
        dataToProcess = duplicateAnalysis.newTransactions;
        break;
      case 'update-existing':
        dataToProcess = [...duplicateAnalysis.newTransactions, ...duplicateAnalysis.duplicateTransactions];
        break;
      case 'import-all':
        dataToProcess = importedData;
        break;
    }

    setProcessedData(dataToProcess.map(t => ({ ...t, selected: false })));
    setCurrentStep('categorization');
    
    // Process with AI
    await processWithAI(dataToProcess);
  };

  const handleDuplicateAnalysisCancel = () => {
    clearData();
    setCurrentStep('upload');
  };

  const handleTransactionsUpdate = (transactions: TransactionRow[]) => {
    console.log('🔍 [DEBUG] handleTransactionsUpdate called with:', {
      length: transactions.length,
      firstTransactionWithAI: transactions.find(t => t.aiSuggestion),
      transactionsWithAI: transactions.filter(t => t.aiSuggestion).length
    });
    setProcessedData(transactions);
  };

  const processWithAI = async (transactions: TransactionRow[]) => {
    setIsProcessingAI(true);
    
    try {
      console.log('🤖 [DEBUG] Iniciando processamento com IA...', {
        transactionCount: transactions.length,
        firstTransaction: transactions[0]
      });
      
      // Carregar categorias e subcategorias
      const [categoriesResult, subcategoriesResult] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('subcategories').select('*').order('name')
      ]);

      if (categoriesResult.error) {
        throw new Error(`Erro ao carregar categorias: ${categoriesResult.error.message}`);
      }

      if (subcategoriesResult.error) {
        throw new Error(`Erro ao carregar subcategorias: ${subcategoriesResult.error.message}`);
      }

      const categories = categoriesResult.data || [];
      const subcategories = subcategoriesResult.data || [];

      console.log('📊 [DEBUG] Dados carregados:', { 
        transactionCount: transactions.length,
        categoryCount: categories.length,
        subcategoryCount: subcategories.length 
      });

      const response = await supabase.functions.invoke('gemini-categorize-transactions', {
        body: {
          transactions: transactions.map(t => ({
            date: t.date,
            description: t.description,
            amount: t.amount,
            payment_method: t.type === 'income' ? 'Entrada' : 'Saída'
          })),
          categories,
          subcategories
        }
      });

      console.log('🎯 [DEBUG] Response da Edge Function:', {
        error: response.error,
        data: response.data,
        rawResponse: response
      });

      if (response.error) {
        throw new Error(`Erro na IA: ${response.error.message}`);
      }

      const { suggestions: aiSuggestions, usedFallback, message } = response.data || {};
      console.log('🎯 [DEBUG] Resposta da IA detalhada:', { 
        suggestions: aiSuggestions?.length || 0, 
        usedFallback,
        message,
        firstSuggestion: aiSuggestions?.[0],
        allSuggestions: aiSuggestions
      });

      const updatedData = transactions.map((transaction, index) => {
        const suggestion = aiSuggestions?.[index];
        console.log(`🔍 [DEBUG] Processando transação ${index}:`, {
          transaction: transaction.description,
          suggestion,
          hasAISuggestion: !!suggestion,
          categoryId: suggestion?.category_id,
          subcategoryId: suggestion?.subcategory_id
        });
        
        const result = {
          ...transaction,
          selected: false,
          categoryId: suggestion?.category_id || undefined,
          subcategoryId: suggestion?.subcategory_id || undefined,
          aiSuggestion: suggestion ? {
            categoryId: suggestion.category_id || '',
            confidence: suggestion.confidence || 0,
            reasoning: suggestion.reasoning || 'Categoria sugerida pela IA',
            isAISuggested: true,
            usedFallback: usedFallback || false
          } : undefined
        };
        
        console.log(`🔍 [DEBUG] Resultado final transação ${index}:`, {
          id: result.id,
          description: result.description,
          categoryId: result.categoryId,
          subcategoryId: result.subcategoryId,
          hasAiSuggestion: !!result.aiSuggestion,
          aiSuggestion: result.aiSuggestion
        });
        return result;
      });

      console.log('🔍 [DEBUG] updatedData final:', {
        length: updatedData.length,
        transactionsWithAI: updatedData.filter(t => t.aiSuggestion).length,
        firstTransactionWithAI: updatedData.find(t => t.aiSuggestion),
        sampleTransactions: updatedData.slice(0, 3).map(t => ({
          id: t.id,
          description: t.description,
          categoryId: t.categoryId,
          subcategoryId: t.subcategoryId,
          hasAiSuggestion: !!t.aiSuggestion
        }))
      });

      setProcessedData(updatedData);
      
      const suggestedCount = aiSuggestions?.filter((s: any) => s.confidence > 0.3).length || 0;
      
      if (usedFallback) {
        toast({
          title: "IA temporariamente indisponível",
          description: `Categorização básica aplicada em ${suggestedCount} de ${transactions.length} transações. Revise as sugestões antes de importar.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "IA processou as transações",
          description: `${suggestedCount} de ${transactions.length} transações categorizadas automaticamente`,
        });
      }

    } catch (error) {
      console.error('⚠️ [DEBUG] Erro no processamento da IA:', error);
      toast({
        variant: "destructive",
        title: "Erro na IA",
        description: error.message || "Falha ao processar com IA, continue manualmente",
      });
    } finally {
      setIsProcessingAI(false);
    }
  };

  const clearData = () => {
    setImportedData([]);
    setProcessedData([]);
    setDuplicateAnalysis(null);
    setImportResults(null);
    setCurrentStep('upload');
    setFilename('');
  };

  const validateTransactions = () => {
    const errors: string[] = [];
    let validCount = 0;
    
    processedData.forEach((transaction, index) => {
      if (!transaction.categoryId) {
        errors.push(`Linha ${index + 1}: Categoria não selecionada`);
      } else {
        validCount++;
      }
    });

    return { errors, validCount };
  };

  const importTransactions = async () => {
    if (processedData.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nenhuma transação para importar",
      });
      return;
    }

    const { errors, validCount } = validateTransactions();
    
    if (errors.length > 0) {
      toast({
        variant: "destructive",
        title: "Validação falhada",
        description: `${errors.length} transações com problemas. Categorize todas as transações antes de importar.`,
      });
      return;
    }

    setIsImporting(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Usuário não autenticado');
      }

      const { data: session, error: sessionError } = await supabase
        .from('import_sessions')
        .insert({
          user_id: user.id,
          filename: filename || 'extrato_bancario.csv',
          total_records: processedData.length,
          status: 'processing'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      let successful = 0;
      let failed = 0;
      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];

      // Process transactions based on import mode
      for (const transaction of processedData) {
        try {
          const transactionData = {
            user_id: user.id,
            external_id: transaction.id,
            date: transaction.date,
            amount: transaction.amount,
            description: transaction.editedDescription || transaction.description,
            original_description: transaction.originalDescription,
            category_id: transaction.categoryId,
            subcategory_id: transaction.subcategoryId,
            type: transaction.type,
            import_session_id: session.id,
            payment_method: transaction.type === 'income' ? 'Transferência' : 'Cartão de Débito'
          };

          if (importMode === 'update-existing' && duplicateAnalysis?.duplicateTransactions.find(d => d.id === transaction.id)) {
            // Update existing transaction
            const { error: updateError } = await supabase
              .from('transactions')
              .update(transactionData)
              .eq('external_id', transaction.id)
              .eq('user_id', user.id);

            if (updateError) {
              failed++;
              errors.push(`Erro ao atualizar transação ${transaction.description}: ${updateError.message}`);
            } else {
              updated++;
            }
          } else {
            // Insert new transaction
            const { error: insertError } = await supabase
              .from('transactions')
              .insert(transactionData);

            if (insertError) {
              if (insertError.code === '23505') {
                skipped++;
              } else {
                failed++;
                errors.push(`Erro ao inserir transação ${transaction.description}: ${insertError.message}`);
              }
            } else {
              successful++;
            }
          }
        } catch (error) {
          failed++;
          errors.push(`Erro inesperado para transação ${transaction.description}: ${error.message}`);
        }
      }

      await supabase
        .from('import_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          processed_records: successful + updated
        })
        .eq('id', session.id);

      // Set results and show results screen
      setImportResults({
        successful,
        failed,
        skipped,
        updated,
        total: processedData.length,
        errors
      });
      
      setCurrentStep('results');

    } catch (error) {
      console.error('Import error:', error);
      toast({
        variant: "destructive",
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const getStats = () => {
    const categorized = processedData.filter(t => t.categoryId).length;
    const uncategorized = processedData.length - categorized;
    const totalValue = processedData.reduce((sum, t) => sum + (t.type === 'expense' ? -t.amount : t.amount), 0);

    return { categorized, uncategorized, totalValue };
  };

  const stats = getStats();

  return (
    <>
      <LoadingOverlay 
        isVisible={isProcessingAI || isAnalyzingDuplicates} 
        message={isProcessingAI ? "Processando transações com IA" : "Analisando duplicatas"}
      />
      
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Importar Extrato</h1>
              <p className="text-muted-foreground">
                Importe transações via CSV ou conecte sua conta bancária diretamente
              </p>
            </div>
            
            {(currentStep === 'categorization' || currentStep === 'duplicate-analysis') && (
              <div className="flex gap-2">
                {isProcessingAI && (
                  <div className="flex items-center gap-2 text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">IA processando...</span>
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={clearData}
                  disabled={isImporting || isProcessingAI}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cancelar Importação
                </Button>
                
                {currentStep === 'categorization' && (
                  <>
                    <Button
                      onClick={() => processWithAI(processedData)}
                      disabled={isImporting || isProcessingAI || processedData.length === 0}
                      variant="outline"
                    >
                      <Bot className="h-4 w-4 mr-2" />
                      Processar com IA
                    </Button>
                    <Button
                      onClick={importTransactions}
                      disabled={isImporting || isProcessingAI || stats.uncategorized > 0}
                      className="min-w-[140px]"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Importando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Importar ({stats.categorized})
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Step-based content */}
        {currentStep === 'upload' && (
          <Tabs defaultValue="csv" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="csv" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Upload CSV
              </TabsTrigger>
              <TabsTrigger value="bank" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Conectar Banco
              </TabsTrigger>
            </TabsList>

            <TabsContent value="csv" className="space-y-6">
              <CSVUploader 
                onDataParsed={handleDataParsed}
                onError={handleError}
              />
              
              {/* Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Formato do Arquivo CSV
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Estrutura obrigatória:</h4>
                    <div className="bg-muted p-3 rounded-md font-mono text-sm mt-2">
                      Data,Valor,ID_Transacao,Descricao
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold">Especificações:</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        <li>Data: DD/MM/AAAA</li>
                        <li>Valor: Formato brasileiro (1.234,56)</li>
                        <li>Codificação: latin-1 (Windows-1252)</li>
                        <li>Tamanho máximo: 10MB</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold">Exemplo:</h4>
                      <div className="bg-muted p-3 rounded-md font-mono text-xs">
                        15/01/2024,-150,50,Supermercado XYZ<br />
                        16/01/2024,2.500,00,Salário Janeiro<br />
                        17/01/2024,-45,30,Combustível
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bank" className="space-y-6">
              <div className="flex justify-center">
                <BelvoConnectWidget />
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Duplicate Analysis Step */}
        {currentStep === 'duplicate-analysis' && duplicateAnalysis && (
          <DuplicateAnalysisCard
            analysis={duplicateAnalysis}
            selectedMode={importMode}
            onModeChange={setImportMode}
            onProceed={handleDuplicateAnalysisProceed}
            onCancel={handleDuplicateAnalysisCancel}
            isLoading={isProcessingAI}
          />
        )}

        {/* Categorization Step */}
        {currentStep === 'categorization' && processedData.length > 0 && (
          <div className="space-y-4">
            {stats.uncategorized > 0 && (
              <Alert>
                <Upload className="h-4 w-4" />
                <AlertDescription>
                  <strong>Atenção:</strong> {stats.uncategorized} transações ainda precisam de categoria. 
                  Categorize todas as transações antes de importar.
                </AlertDescription>
              </Alert>
            )}
            
            <TransactionImportTable
              transactions={processedData}
              onTransactionsUpdate={handleTransactionsUpdate}
            />
          </div>
        )}

        {/* Results Step */}
        {currentStep === 'results' && importResults && (
          <ImportResultsCard
            result={importResults}
            onClose={clearData}
          />
        )}
      </div>
    </>
  );
}
