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
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { BankSelector } from '@/components/BankSelector';
import { supabase } from '@/integrations/supabase/client';
import { detectDuplicates } from '@/services/duplicateDetection';
import transactionMappingService from '@/services/transactionMapping';
import creditCardCategorizationService from '@/services/creditCardCategorization';
import type { TransactionRow, RefundedTransaction, UnifiedPixTransaction } from '@/types/transaction';

// Define ParsedTransaction interface based on CSVUploader
interface ParsedTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  originalDescription: string;
  type: 'income' | 'expense';
}

// Utility function to validate UUID format
const isValidUUID = (str: string | undefined | null): boolean => {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

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
  const [currentStep, setCurrentStep] = useState<'upload' | 'duplicate-analysis' | 'review' | 'processing' | 'results'>('upload');
  const [selectedBank, setSelectedBank] = useState<string>('nubank');
  const [importSession, setImportSession] = useState<ImportSession | null>(null);
  const [layoutType, setLayoutType] = useState<'bank' | 'credit_card' | null>(null);

  // Persist session ID in localStorage to survive page reloads
  const saveSessionToStorage = (session: ImportSession) => {
    localStorage.setItem('currentImportSession', JSON.stringify(session));
  };

  const loadSessionFromStorage = (): ImportSession | null => {
    try {
      const stored = localStorage.getItem('currentImportSession');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      // console.error('Error loading session from storage:', error);
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
      // console.log('🔄 [SESSION] Loaded session from storage:', storedSession.id);
      setImportSession(storedSession);
    }
  }, []);
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
  const [selectedImportMode, setSelectedImportMode] = useState<'new-only' | 'update-existing' | 'import-all'>('new-only');
  const { toast } = useToast();

  // Check authentication status
  const checkAuthentication = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      // console.error('❌ [AUTH] Error checking authentication:', error);
      toast({
        title: "Erro de autenticação",
        description: "Não foi possível verificar a autenticação. Por favor, faça login novamente.",
        variant: "destructive"
      });
      return false;
    }

    if (!user) {
      // console.warn('⚠️ [AUTH] User not authenticated');
      toast({
        title: "Não autenticado",
        description: "Por favor, faça login para importar transações.",
        variant: "destructive"
      });
      return false;
    }

    // console.log('✅ [AUTH] User authenticated:', user.id);
    return true;
  };

  const handleDataParsed = async (parsedTransactions: ParsedTransaction[], layoutType?: 'bank' | 'credit_card') => {
    // console.log('📊 [IMPORT] handleDataParsed called with:', parsedTransactions.length, 'transactions', 'Layout type:', layoutType);
    
    // Store the layout type
    setLayoutType(layoutType || null);
    
    // Convert ParsedTransaction to TransactionRow
    const transactionRows: TransactionRow[] = parsedTransactions.map(transaction => {
      // Para cartão de crédito, definir todas as transações como expense
      const transactionType = layoutType === 'credit_card' ? 'expense' : transaction.type;
      
      return {
        ...transaction,
        type: transactionType,
        selected: true,
        originalDescription: transaction.originalDescription || transaction.description,
        editedDescription: transaction.description,
        isEditing: false,
        status: 'normal'
      };
    });
    
    // For credit card transactions, check for duplicates and send to Gemini for categorization before review
    if (layoutType === 'credit_card') {
      // console.log('💳 [IMPORT] Credit card transactions detected, checking for duplicates first');
      
      try {
        // Check authentication first
        const isAuthenticated = await checkAuthentication();
        if (!isAuthenticated) {
          return;
        }

        // Load existing credit card transactions for duplicate detection
        const { data: existingCreditData, error: creditError } = await supabase
          .from('transaction_credit')
          .select('*')
          .order('date', { ascending: false });

        if (creditError) {
          // console.error('❌ [IMPORT] Error loading existing credit transactions:', creditError);
          toast({
            title: "Erro ao carregar transações de crédito",
            description: creditError.message,
            variant: "destructive"
          });
          return;
        }

        setExistingTransactions(existingCreditData || []);
        
        // Detect duplicates for credit card transactions
        const duplicateResults = detectDuplicates(transactionRows, existingCreditData || []);
        
        console.log('🔍 [CREDIT-IMPORT] Duplicate detection results:', {
          duplicates: duplicateResults.duplicates.length,
          newTransactions: duplicateResults.newTransactions.length,
          total: transactionRows.length
        });

        // Check if we have duplicates that require user attention
        const hasDuplicates = duplicateResults.duplicates.length > 0;

        if (hasDuplicates) {
          console.log('⚠️ [CREDIT-IMPORT] Duplicates detected, showing analysis screen');
          setDuplicateAnalysis({
            duplicates: duplicateResults.duplicates,
            newTransactions: duplicateResults.newTransactions
          });
          setCurrentStep('duplicate-analysis');
          return;
        }

        // Use only new transactions (no duplicates) for AI processing
        const newTransactionsOnly = duplicateResults.newTransactions;
        console.log('💳 [IMPORT] Processing', newTransactionsOnly.length, 'new credit card transactions for AI categorization');

        setIsProcessing(true);
        setProcessingProgress(25);
        setCurrentStep('processing');

        // Get current user for mapping lookup
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        setProcessingProgress(50);

        // First, apply existing credit card mappings to avoid unnecessary AI processing
        console.log('🔍 [CREDIT-MAPPING] Checking for existing credit card mappings...');
        
        const { mappedTransactions, unmappedTransactions } = await transactionMappingService.applyMappingsToTransactions(
          newTransactionsOnly,
          user.id,
          'credit_card' // Use credit_card mapping type for credit transactions
        );

        console.log('📊 [CREDIT-MAPPING] Credit mapping results:', {
          mapped: mappedTransactions.length,
          unmapped: unmappedTransactions.length,
          total: transactionRows.length
        });

        setProcessingProgress(65);

        // Only process unmapped transactions with Gemini AI
        let aiCategorizedTransactions: any[] = [];
        if (unmappedTransactions.length > 0) {
          console.log('🤖 [CREDIT-AI] Sending', unmappedTransactions.length, 'unmapped credit transactions to AI');
          
          // Call the credit card specific Gemini function
          const { data: aiResults, error: aiError } = await supabase.functions.invoke('gemini-categorize-credit', {
            body: { transactions: unmappedTransactions }
          });

          if (aiError) {
            console.error('❌ [IMPORT] Error in AI categorization for credit card:', aiError);
            console.log('🔄 [CREDIT-FALLBACK] Trying local categorization as fallback...');
            
            try {
              // Use local categorization as fallback
              const localResults = await creditCardCategorizationService.categorizeCreditTransactions(
                unmappedTransactions.map(t => ({
                  id: t.id,
                  description: t.description,
                  amount: t.amount,
                  type: t.type
                }))
              );
              
              aiCategorizedTransactions = localResults;
              console.log('✅ [CREDIT-FALLBACK] Local categorization completed successfully');
              
              toast({
                title: "Categorização local aplicada",
                description: "Usando padrões locais para categorizar transações de crédito",
                variant: "default"
              });
            } catch (localError) {
              console.error('❌ [CREDIT-FALLBACK] Local categorization also failed:', localError);
              toast({
                title: "Erro na categorização",
                description: "Não foi possível categorizar as transações. Continue manualmente.",
                variant: "destructive"
              });
              // Continue without categorization
            }
          } else {
            aiCategorizedTransactions = aiResults || [];
            console.log('✅ [CREDIT-AI] AI categorization for credit card completed');
          }
        } else {
          console.log('✅ [CREDIT-MAPPING] All credit transactions already mapped, skipping AI categorization');
        }

        setProcessingProgress(85);

        // Combine mapped transactions with AI categorized transactions
        const fullyCategorizedTransactions = [
          ...mappedTransactions.map(transaction => {
            // Para valores negativos (pagamentos de fatura), remover categorias
            if (transaction.amount < 0) {
              return {
                ...transaction,
                categoryId: undefined,
                subcategoryId: undefined,
                aiSuggestion: undefined
              };
            }
            return transaction;
          }),
          ...unmappedTransactions.map(transaction => {
            // Para valores negativos (pagamentos de fatura), não categorizar
            if (transaction.amount < 0) {
              return {
                ...transaction,
                categoryId: undefined,
                subcategoryId: undefined,
                aiSuggestion: undefined
              };
            }
            
            const aiSuggestion = aiCategorizedTransactions.find((cat: any) => cat.id === transaction.id);

            return {
              ...transaction,
              categoryId: aiSuggestion?.categoryId,
              subcategoryId: aiSuggestion?.subcategoryId,
              aiSuggestion: aiSuggestion ? {
                categoryId: aiSuggestion.categoryId,
                confidence: aiSuggestion.confidence,
                reasoning: aiSuggestion.reasoning,
                isAISuggested: true
              } : undefined
            };
          })
        ];
        
        setProcessingProgress(100);
        setTransactions(fullyCategorizedTransactions);
        setCurrentStep('review');
        
      } catch (error) {
        console.error('💥 [IMPORT] Exception in credit card AI categorization:', error);
        toast({
          title: "Erro na categorização",
          description: "Ocorreu um erro ao categorizar as transações de crédito",
          variant: "destructive"
        });
        setCurrentStep('upload');
      } finally {
        setIsProcessing(false);
      }
      
      return;
    }
    
    try {
      // Check authentication first
      const isAuthenticated = await checkAuthentication();
      if (!isAuthenticated) {
        return;
      }

      // Load existing transactions for duplicate detection
      const { data: existingData, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        // console.error('❌ [IMPORT] Error loading existing transactions:', error);
        toast({
          title: "Erro ao carregar transações",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      setExistingTransactions(existingData || []);
      
      // Detect duplicates, refunds, and unified PIX
      const duplicateResults = detectDuplicates(transactionRows, existingData || []);
      
      // console.log('🔍 [IMPORT] Duplicate detection results:', {
      //   duplicates: duplicateResults.duplicates.length,
      //   refunds: duplicateResults.refundPairs.length,
      //   unifiedPix: duplicateResults.pixPairs.length,
      //   newTransactions: duplicateResults.newTransactions.length,
      //   hidden: duplicateResults.hiddenTransactionIds.size
      // });

      // Validation: Log details of unification
      // if (duplicateResults.refundPairs.length > 0) {
      //   console.log('✅ [VALIDATION] Refund pairs found:');
      //   duplicateResults.refundPairs.forEach((pair, index) => {
      //     console.log(`  Refund ${index + 1}:`, {
      //       pairId: pair.id,
      //       originalAmount: pair.originalTransaction.amount,
      //       originalDescription: pair.originalTransaction.description,
      //       refundAmount: pair.refundTransaction.amount,
      //       refundDescription: pair.refundTransaction.description
      //     });
      //   });
      // }

      // if (duplicateResults.pixPairs.length > 0) {
      //   console.log('✅ [VALIDATION] PIX pairs found:');
      //   duplicateResults.pixPairs.forEach((pair, index) => {
      //     console.log(`  PIX ${index + 1}:`, {
      //       pairId: pair.id,
      //       creditAmount: pair.creditTransaction.amount,
      //       creditDescription: pair.creditTransaction.description,
      //       pixAmount: pair.pixTransaction.amount,
      //       pixDescription: pair.pixTransaction.description
      //     });
      //   });
      // }

      setDuplicateAnalysis({
        duplicates: duplicateResults.duplicates,
        newTransactions: duplicateResults.newTransactions
      });

      // Check if we have duplicates that require user attention
      const hasDuplicates = duplicateResults.duplicates.length > 0;

      if (hasDuplicates) {
        // console.log('⚠️ [IMPORT] Duplicates detected, showing analysis screen');
        setCurrentStep('duplicate-analysis');
      } else {
        // console.log('✅ [IMPORT] No duplicates detected, proceeding with import-all mode');
        
        // Create unified transactions - ONE transaction per group
        const unifiedTransactions = [
          ...duplicateResults.newTransactions,
          // Add refund representative transactions (valor original, sem categoria)
          ...duplicateResults.refundPairs.map(pair => {
            // console.log('🔄 [REFUND] Creating refund transaction:', {
            //   originalAmount: pair.originalTransaction.amount,
            //   originalDescription: pair.originalTransaction.description,
            //   pairId: pair.id
            // });
            return {
              id: pair.id,
              date: pair.originalTransaction.date,
              amount: pair.originalTransaction.amount, // Valor original (não zero)
              description: `Estorno Total: ${pair.originalTransaction.description}`,
              originalDescription: pair.originalTransaction.originalDescription || pair.originalTransaction.description,
              type: pair.originalTransaction.type,
              status: 'refunded' as const,
              selected: true,
              categoryId: undefined, // Sem categoria
              subcategoryId: undefined,
              // Sem sugestão de IA para estornos
              aiSuggestion: undefined
            };
          }),
          // Add PIX Crédito representative transactions
          ...duplicateResults.pixPairs.map(pair => ({
            id: pair.id,
            date: pair.pixTransaction.date,
            amount: pair.pixTransaction.amount, // Valor do PIX
            description: `PIX Crédito: ${pair.pixTransaction.description}`,
            originalDescription: pair.pixTransaction.originalDescription || pair.pixTransaction.description,
            type: pair.pixTransaction.type,
            status: 'unified-pix' as const,
            selected: true,
            categoryId: pair.pixTransaction.categoryId,
            subcategoryId: pair.pixTransaction.subcategoryId
          }))
        ];

        // Validation: Verify unification integrity
        // console.log('🔍 [VALIDATION] Final unified transactions:', {
        //   totalOriginal: transactionRows.length,
        //   totalUnified: unifiedTransactions.length,
        //   newTransactions: duplicateResults.newTransactions.length,
        //   refundTransactions: duplicateResults.refundPairs.length,
        //   pixTransactions: duplicateResults.pixPairs.length,
        //   hiddenTransactions: duplicateResults.hiddenTransactionIds.size
        // });

        // Verify that no refunds have categories
        const refundsWithCategories = unifiedTransactions.filter(t => 
          t.status === 'refunded' && (t.categoryId || t.subcategoryId)
        );
        if (refundsWithCategories.length > 0) {
          // console.error('🚨 [VALIDATION] ERROR: Refunds should not have categories!', refundsWithCategories);
        }

        await handleAICategorization(unifiedTransactions);
      }

    } catch (error) {
      // console.error('💥 [IMPORT] Exception in handleDataParsed:', error);
      toast({
        title: "Erro no processamento",
        description: "Ocorreu um erro ao processar as transações",
        variant: "destructive"
      });
    }
  };

  const handleAICategorization = async (transactionsToProcess: TransactionRow[]) => {
    // console.log('🤖 [AI] Starting AI categorization for', transactionsToProcess.length, 'transactions');
    
    // Check authentication again before proceeding
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    setCurrentStep('processing');

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // console.log('👤 [AI] Creating session for user:', user.id);

      // First, apply existing mappings to avoid unnecessary AI processing
      // console.log('🔍 [MAPPING] Checking for existing mappings...');
      // console.log('🔍 [MAPPING] Processing transactions:', transactionsToProcess.map(t => ({
      //   id: t.id,
      //   description: t.description,
      //   status: t.status
      // })));
      
      const { mappedTransactions, unmappedTransactions } = await transactionMappingService.applyMappingsToTransactions(
        transactionsToProcess,
        user.id
      );

      // console.log('📊 [MAPPING] Mapping results:', {
      //   mapped: mappedTransactions.length,
      //   unmapped: unmappedTransactions.length,
      //   total: transactionsToProcess.length
      // });

      // Only process unmapped transactions with AI
      let categorizedTransactions: any[] = [];
      if (unmappedTransactions.length > 0) {
        // console.log('🤖 [AI] Sending', unmappedTransactions.length, 'unmapped transactions to AI for categorization');

        // Create session with user_id
        const { data: session, error: sessionError } = await supabase
          .from('import_sessions')
          .insert({
            filename: 'import_' + Date.now(),
            total_records: transactionsToProcess.length,
            status: 'processing',
            user_id: user.id
          })
          .select()
          .single();

        if (sessionError) {
          // console.error('❌ [AI] Error creating import session:', sessionError);
          throw sessionError;
        }

        // console.log('✅ [AI] Import session created:', session.id);
        const newSession = session as ImportSession;
        setImportSession(newSession);
        saveSessionToStorage(newSession);

        // Update progress
        setProcessingProgress(25);

        // Process with AI categorization only for unmapped transactions
        // console.log('🤖 [AI] Calling gemini-categorize-transactions function');
        const { data: aiCategorizedTransactions, error: aiError } = await supabase.functions.invoke('gemini-categorize-transactions', {
          body: { transactions: unmappedTransactions }
        });

        if (aiError) {
          // console.error('❌ [AI] Error in AI categorization:', aiError);
          throw aiError;
        }

        // console.log('✅ [AI] AI categorization completed successfully');
        categorizedTransactions = aiCategorizedTransactions || [];
        setProcessingProgress(75);
      } else {
        // console.log('✅ [MAPPING] All transactions already mapped, skipping AI categorization');
        setProcessingProgress(75);
      }

      // Combine mapped transactions with AI categorized transactions
      // console.log('🔍 [COMBINE] Combining mapped and AI categorized transactions:', {
      //   mappedCount: mappedTransactions.length,
      //   unmappedCount: unmappedTransactions.length,
      //   aiCategorizedCount: categorizedTransactions.length
      // });
      
      const allCategorizedTransactions = [
        ...mappedTransactions,
        ...unmappedTransactions.map(transaction => {
          // Find AI suggestion for this transaction
          const aiSuggestion = categorizedTransactions.find((cat: any) => cat.id === transaction.id);
          
          if (aiSuggestion) {
            // console.log('✅ [COMBINE] Found AI suggestion for transaction:', transaction.id);
            return {
              ...transaction,
              categoryId: aiSuggestion.categoryId,
              subcategoryId: aiSuggestion.subcategoryId,
              type: transaction.type, // Explicitly preserve the original transaction type
              aiSuggestion: {
                categoryId: aiSuggestion.categoryId,
                confidence: aiSuggestion.confidence,
                reasoning: aiSuggestion.reasoning,
                isAISuggested: true
              }
            };
          }
          
          // If no AI suggestion, return transaction as is
          // console.log('⚠️ [COMBINE] No AI suggestion found for transaction:', transaction.id);
          return transaction;
        })
      ];

      setTransactions(allCategorizedTransactions);
      setProcessingProgress(100);
      setCurrentStep('review');

    } catch (error) {
      // console.error('💥 [AI] Exception in AI categorization:', error);
      
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
        description: error instanceof Error ? error.message : "Ocorreu um erro ao categorizar as transações com IA",
        variant: "destructive"
      });

      // Reset to upload step
      setCurrentStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDuplicateAnalysisComplete = async (
    selectedTransactions: TransactionRow[],
    action: 'import' | 'skip' | 'overwrite'
  ) => {
    // console.log('🔄 [DUPLICATE] handleDuplicateAnalysisComplete called:', {
    //   selectedCount: selectedTransactions.length,
    //   action
    // });

    if (action === 'skip') {
      setCurrentStep('upload');
      return;
    }

    // Re-detect to get fresh pairs data
    const duplicateResults = detectDuplicates(selectedTransactions, existingTransactions);
    
    // Create unified transactions list based on selected mode
    const unifiedTransactions = [
      ...duplicateResults.newTransactions,
      // Add refund representative transactions (valor original, sem categoria)
      ...duplicateResults.refundPairs.map(pair => {
        // console.log('🔄 [REFUND] Creating refund transaction from analysis:', {
        //   originalAmount: pair.originalTransaction.amount,
        //   originalDescription: pair.originalTransaction.description,
        //   pairId: pair.id
        // });
        return {
          id: pair.id,
          date: pair.originalTransaction.date,
          amount: pair.originalTransaction.amount, // Valor original (não zero)
          description: `Estorno Total: ${pair.originalTransaction.description}`,
          originalDescription: pair.originalTransaction.originalDescription || pair.originalTransaction.description,
          type: pair.originalTransaction.type,
          status: 'refunded' as const,
          selected: true,
          categoryId: undefined, // Sem categoria
          subcategoryId: undefined,
          // Sem sugestão de IA para estornos
          aiSuggestion: undefined
        };
      }),
      // Add PIX Crédito representative transactions
      ...duplicateResults.pixPairs.map(pair => ({
        id: pair.id,
        date: pair.pixTransaction.date,
        amount: pair.pixTransaction.amount, // Valor do PIX
        description: `PIX Crédito: ${pair.pixTransaction.description}`,
        originalDescription: pair.pixTransaction.originalDescription || pair.pixTransaction.description,
        type: pair.pixTransaction.type,
        status: 'unified-pix' as const,
        selected: true,
        categoryId: pair.pixTransaction.categoryId,
        subcategoryId: pair.pixTransaction.subcategoryId
      }))
    ];
      
    // Handle duplicates based on selected mode
    if (selectedImportMode === 'update-existing') {
      console.log('🔄 [DUPLICATE] Update mode selected, loading existing data from database');
      
      // For update mode, use existing data with categories from database
      const duplicatesWithExistingData = duplicateResults.duplicates.map(duplicate => {
        const existingTransaction = duplicate.existing;
        
        console.log('🔄 [DUPLICATE-UPDATE] Processing duplicate with existing data:', {
          newTransactionId: duplicate.new.id,
          existingTransactionId: existingTransaction.id,
          existingCategoryId: existingTransaction.category_id,
          existingSubcategoryId: existingTransaction.subcategory_id,
          existingDescription: existingTransaction.description,
          categoryIdType: typeof existingTransaction.category_id,
          subcategoryIdType: typeof existingTransaction.subcategory_id,
          categoryIdValid: isValidUUID(existingTransaction.category_id),
          subcategoryIdValid: isValidUUID(existingTransaction.subcategory_id)
        });

        return {
          ...duplicate.new,
          // Use existing categories from database
          categoryId: existingTransaction.category_id || duplicate.new.categoryId,
          subcategoryId: existingTransaction.subcategory_id || duplicate.new.subcategoryId,
          // Mark as using existing data
          aiSuggestion: {
            categoryId: existingTransaction.category_id,
            subcategoryId: existingTransaction.subcategory_id,
            confidence: 1.0,
            reasoning: 'Categorização existente do banco de dados',
            isAISuggested: false
          }
        };
      });
      
      unifiedTransactions.push(...duplicatesWithExistingData);
      
      // Skip AI processing for update mode - but ensure categories are loaded first
      console.log('✅ [DUPLICATE] Skipping AI processing for update mode, ensuring categories are loaded');
      
      // Wait for categories and subcategories to be fully loaded before proceeding
      try {
        console.log('🔍 [DUPLICATE-UPDATE] Ensuring categories and subcategories are loaded...');
        
        // Force reload categories and subcategories to ensure they're available
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .order('name');
          
        const { data: subcategoriesData, error: subcategoriesError } = await supabase
          .from('subcategories')
          .select('*')
          .order('name');
          
        if (categoriesError) {
          console.error('❌ [DUPLICATE-UPDATE] Error loading categories:', categoriesError);
          toast({
            title: "Erro ao carregar categorias",
            description: "Não foi possível carregar as categorias para exibição",
            variant: "destructive"
          });
          return;
        }
        
        if (subcategoriesError) {
          console.error('❌ [DUPLICATE-UPDATE] Error loading subcategories:', subcategoriesError);
          toast({
            title: "Erro ao carregar subcategorias", 
            description: "Não foi possível carregar as subcategorias para exibição",
            variant: "destructive"
          });
          return;
        }
        
        console.log('✅ [DUPLICATE-UPDATE] Categories and subcategories loaded successfully:', {
          categories: categoriesData?.length || 0,
          subcategories: subcategoriesData?.length || 0,
          categoriesData: categoriesData?.slice(0, 3).map(c => ({ id: c.id, name: c.name })),
          subcategoriesData: subcategoriesData?.slice(0, 3).map(s => ({ id: s.id, name: s.name }))
        });
        
        // Validate that the existing category/subcategory IDs are valid
        const validCategoryIds = new Set(categoriesData?.map(c => c.id) || []);
        const validSubcategoryIds = new Set(subcategoriesData?.map(s => s.id) || []);
        
        // Validate and clean up the unified transactions
        const validatedTransactions = unifiedTransactions.map(transaction => {
          const validatedTransaction = { ...transaction };
          
          // Validate categoryId
          if (transaction.categoryId && !validCategoryIds.has(transaction.categoryId)) {
            console.warn('⚠️ [DUPLICATE-UPDATE] Invalid categoryId found:', {
              transactionId: transaction.id,
              categoryId: transaction.categoryId,
              description: transaction.description
            });
            validatedTransaction.categoryId = undefined;
          }
          
          // Validate subcategoryId
          if (transaction.subcategoryId && !validSubcategoryIds.has(transaction.subcategoryId)) {
            console.warn('⚠️ [DUPLICATE-UPDATE] Invalid subcategoryId found:', {
              transactionId: transaction.id,
              subcategoryId: transaction.subcategoryId,
              description: transaction.description
            });
            validatedTransaction.subcategoryId = undefined;
          }
          
          return validatedTransaction;
        });
        
        console.log('✅ [DUPLICATE-UPDATE] Transactions validated, proceeding to review');
        setTransactions(validatedTransactions);
        setCurrentStep('review');
        
      } catch (error) {
        console.error('❌ [DUPLICATE-UPDATE] Error ensuring categories are loaded:', error);
        toast({
          title: "Erro ao preparar dados",
          description: "Ocorreu um erro ao preparar os dados para edição",
          variant: "destructive"
        });
      }
      
    } else if (selectedImportMode === 'import-all') {
      // For import-all mode, include duplicates but they will go through AI processing
      unifiedTransactions.push(...duplicateResults.duplicates.map(d => d.new));
      
      // Continue with AI categorization
      await handleAICategorization(unifiedTransactions);
      
    } else {
      // For new-only mode, only process new transactions
      await handleAICategorization(unifiedTransactions);
    }
  }

  const handleTransactionsUpdate = (updatedTransactions: TransactionRow[]) => {
    // console.log('🔄 [UPDATE] handleTransactionsUpdate called with:', updatedTransactions.length, 'transactions');
    setTransactions(updatedTransactions);
  };

  const handleFinalImport = async () => {
    // console.log('💾 [FINAL] handleFinalImport called');

    // Check authentication one more time
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
      return;
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    // If no session exists, create a new one
    let currentSession = importSession;
    if (!currentSession) {
      // console.log('⚠️ [FINAL] No import session found, creating new one');
      
      try {
        const { data: newSession, error: sessionError } = await supabase
          .from('import_sessions')
          .insert({
            filename: 'recovery_import_' + Date.now(),
            total_records: transactions.length,
            status: 'processing',
            user_id: user.id
          })
          .select()
          .single();

        if (sessionError) {
          // console.error('❌ [FINAL] Error creating recovery session:', sessionError);
          toast({
            title: "Erro",
            description: "Não foi possível criar sessão de importação",
            variant: "destructive"
          });
          return;
        }

        // console.log('✅ [FINAL] Recovery session created:', newSession.id);
        currentSession = newSession as ImportSession;
        setImportSession(currentSession);
        saveSessionToStorage(currentSession);
      } catch (error) {
        // console.error('💥 [FINAL] Exception creating recovery session:', error);
        toast({
          title: "Erro",
          description: "Sessão de importação não encontrada e não foi possível criar uma nova",
          variant: "destructive"
        });
        return;
      }
    }

    // Check if we're importing credit card transactions (based on the layout type)
    if (layoutType === 'credit_card') {
      // For credit card transactions, validate categories but exclude informative transactions
      const creditCardTransactionsMissingCategory = transactions.filter(t => {
        // Skip informative transactions (negative amounts or specific descriptions)
        const isInformative = t.amount < 0 || [
          'pagamento recebido',
          'juros de dívida encerrada', 
          'saldo em atraso',
          'crédito de atraso',
          'encerramento de dívida'
        ].some(desc => t.description.toLowerCase().includes(desc));
        
        if (isInformative) return false;
        
        // Check if regular transactions have categories
        return !t.categoryId || !isValidUUID(t.categoryId) || !t.subcategoryId || !isValidUUID(t.subcategoryId);
      });
      
      if (creditCardTransactionsMissingCategory.length > 0) {
        toast({
          title: "Erro de validação",
          description: `Existem ${creditCardTransactionsMissingCategory.length} transações de crédito sem categoria ou subcategoria definida. Por favor, atribua categorias antes de importar (exceto pagamentos informativos).`,
          variant: "destructive"
        });
        return;
      }
      
      setIsProcessing(true);
      setProcessingProgress(0);

      try {
        // Prepare credit card transactions for import
        const creditCardTransactionsToImport = transactions.map(transaction => ({
          date: transaction.date, // Use date as-is without time component
          amount: transaction.amount,
          description: transaction.editedDescription || transaction.description,
          original_description: transaction.originalDescription,
          external_id: transaction.id,
          type: transaction.type,
          category_id: isValidUUID(transaction.categoryId) ? transaction.categoryId : null,
          subcategory_id: isValidUUID(transaction.subcategoryId) ? transaction.subcategoryId : null,
          bank_id: selectedBank === 'nubank' ? '00000000-0000-0000-0000-000000000001' : null,
          import_session_id: currentSession.id,
          user_id: user.id
        }));

        // console.log('💾 [FINAL] Importing', creditCardTransactionsToImport.length, 'credit card transactions');

        // Import to transaction_credit table
        const { data, error } = await supabase
          .from('transaction_credit')
          .insert(creditCardTransactionsToImport)
          .select();

        if (error) {
          // console.error('❌ [FINAL] Error importing credit card transactions:', error);
          throw error;
        }

        // Update transaction mappings for credit card transactions
        // This allows future imports to use the categorization decisions made during this import
        console.log('🔍 [CREDIT-MAPPING] Starting mapping process for', transactions.length, 'transactions');
        
        for (const transaction of transactions) {
          console.log('🔍 [CREDIT-MAPPING] Processing transaction:', {
            id: transaction.id,
            description: transaction.description,
            categoryId: transaction.categoryId,
            subcategoryId: transaction.subcategoryId
          });
          
          // Skip transactions without categories (pagamentos informativos)
          if (!transaction.categoryId || !transaction.subcategoryId) {
            console.log('⚠️ [CREDIT-MAPPING] Skipping transaction without categories:', transaction.id);
            continue;
          }

          const standardizedIdentifier = transactionMappingService.standardizeIdentifier(transaction.description);
          console.log('🔍 [CREDIT-MAPPING] Standardized identifier:', {
            original: transaction.description,
            standardized: standardizedIdentifier
          });
          
          try {
            // Check if mapping already exists
            const existingMapping = await transactionMappingService.findMapping(standardizedIdentifier, user.id);
            
            // Determine the source of the categorization
            const source = transaction.aiSuggestion?.isAISuggested ? 'AI' : 'Manual';
            const confidenceScore = transaction.aiSuggestion?.confidence || 1;
            
            console.log('🔍 [CREDIT-MAPPING] Mapping details:', {
              existingMapping: existingMapping.found,
              source,
              confidenceScore
            });
            
            if (existingMapping.found) {
              // Update existing mapping with user's final decision
              const result = await transactionMappingService.updateMapping(existingMapping.mapping!.id, {
                categoryId: transaction.categoryId,
                subcategoryId: transaction.subcategoryId,
                confidenceScore: confidenceScore,
                source: source,
                mappingType: 'credit_card'
              });
              console.log('🔄 [CREDIT-MAPPING] Updated existing mapping for credit transaction:', {
                transactionId: transaction.id,
                result: !!result
              });
            } else {
              // Create new mapping for this credit transaction
              const result = await transactionMappingService.createMapping({
                standardizedIdentifier,
                userId: user.id,
                categoryId: transaction.categoryId,
                subcategoryId: transaction.subcategoryId,
                confidenceScore: confidenceScore,
                source: source,
                mappingType: 'credit_card'
              });
              console.log('🆕 [CREDIT-MAPPING] Created new mapping for credit transaction:', {
                transactionId: transaction.id,
                result: !!result
              });
            }
          } catch (error) {
            console.error('❌ [CREDIT-MAPPING] Error processing credit transaction mapping for transaction:', transaction.id, error);
          }
        }

        setImportResults({
          imported: creditCardTransactionsToImport.length,
          skipped: 0,
          errors: []
        });

        setProcessingProgress(100);
        setCurrentStep('results');

        // Clear session from storage after successful import
        clearSessionFromStorage();

        toast({
          title: "Importação concluída",
          description: `${creditCardTransactionsToImport.length} transações de cartão de crédito importadas com sucesso`,
          variant: "default"
        });

      } catch (error) {
        // console.error('💥 [FINAL] Exception in credit card import:', error);

        await supabase
          .from('import_sessions')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', importSession.id);

        toast({
          title: "Erro na importação",
          description: "Ocorreu um erro ao importar as transações de cartão de crédito",
          variant: "destructive"
        });
      } finally {
        setIsProcessing(false);
      }

      return;
    }

    // Validate that all transactions have a valid categoryId and subcategoryId before importing, excluding refunds
    const transactionsMissingCategory = transactions.filter(t => 
      t.status !== 'refunded' && (!t.categoryId || !isValidUUID(t.categoryId) || !t.subcategoryId || !isValidUUID(t.subcategoryId))
    );
    if (transactionsMissingCategory.length > 0) {
      toast({
        title: "Erro de validação",
        description: `Existem ${transactionsMissingCategory.length} transações sem categoria ou subcategoria definida. Por favor, atribua categorias e subcategorias antes de importar.`,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Prepare transactions for final import
      const transactionsToImport = transactions.map(transaction => ({
        external_id: transaction.id,
        date: transaction.date + 'T12:00:00', // Append noon time to avoid timezone shift
        amount: transaction.amount,
        description: transaction.editedDescription || transaction.description,
        original_description: transaction.originalDescription,
        type: transaction.type,
        category_id: isValidUUID(transaction.categoryId) ? transaction.categoryId : null,
        subcategory_id: isValidUUID(transaction.subcategoryId) ? transaction.subcategoryId : null,
        bank_id: selectedBank === 'nubank' ? '00000000-0000-0000-0000-000000000001' : null,
        payment_method: null,
        tags: null,
        notes: null,
        is_recurring: false,
        recurring_frequency: null,
        import_session_id: importSession.id,
        user_id: user.id
      }));

      // console.log('💾 [FINAL] Importing', transactionsToImport.length, 'transactions');

      // Import to database
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionsToImport)
        .select();

      if (error) {
        // console.error('❌ [FINAL] Error importing transactions:', error);
        throw error;
      }

      // Update transaction mappings with final user decisions
      // Only update mappings for transactions that were categorized by the user
      for (const transaction of transactions) {
        // Skip refunds as they don't need categorization
        if (transaction.status === 'refunded') continue;
        
        // Skip transactions without categories
        if (!transaction.categoryId || !transaction.subcategoryId) continue;

        const standardizedIdentifier = transactionMappingService.standardizeIdentifier(transaction.description);
        try {
          // Check if mapping already exists
          const existingMapping = await transactionMappingService.findMapping(standardizedIdentifier, user.id);
          
          // Determine the source of the categorization
          const source = transaction.aiSuggestion?.isAISuggested ? 'AI' : 'Manual';
          const confidenceScore = transaction.aiSuggestion?.confidence || 1;
          
          if (existingMapping.found) {
            // Update existing mapping with user's final decision
            // Even if it was AI-suggested, if the user accepted it, we update the mapping
            await transactionMappingService.updateMapping(existingMapping.mapping!.id, {
              categoryId: transaction.categoryId,
              subcategoryId: transaction.subcategoryId,
              confidenceScore: confidenceScore,
              source: source
            });
            // console.log('🔄 [MAPPING] Updated existing mapping for transaction:', transaction.id);
          } else {
            // Create new mapping for this transaction
            await transactionMappingService.createMapping({
              standardizedIdentifier,
              userId: user.id,
              categoryId: transaction.categoryId,
              subcategoryId: transaction.subcategoryId,
              confidenceScore: confidenceScore,
              source: source
            });
            // console.log('🆕 [MAPPING] Created new mapping for transaction:', transaction.id);
          }
        } catch (error) {
          // console.error('Error processing transaction mapping for transaction:', transaction.id, error);
        }
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

      // Clear session from storage after successful import
      clearSessionFromStorage();

      toast({
        title: "Importação concluída",
        description: `${transactionsToImport.length} transações importadas com sucesso`,
        variant: "default"
      });

    } catch (error) {
      // console.error('💥 [FINAL] Exception in final import:', error);

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
    setCurrentStep('upload');
    setImportSession(null);
    setIsProcessing(false);
    setProcessingProgress(0);
    setImportResults(null);
    setExistingTransactions([]);
    setDuplicateAnalysis(null);
    setLayoutType(null);
    
    // Clear session from storage when resetting
    clearSessionFromStorage();
  };

  // Determine if duplicate analysis step should be shown
  const shouldShowDuplicateStep = duplicateAnalysis && duplicateAnalysis.duplicates.length > 0;

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

      {/* Progress Steps - Only show analysis step if there are duplicates */}
      <div className="flex items-center space-x-4 mb-6">
        <div className={`flex items-center ${currentStep === 'upload' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            1
          </div>
          <span className="ml-2">Upload</span>
        </div>
        
        {shouldShowDuplicateStep && (
          <>
            <div className="flex-1 h-px bg-border" />
            <div className={`flex items-center ${currentStep === 'duplicate-analysis' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'duplicate-analysis' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                2
              </div>
              <span className="ml-2">Análise</span>
            </div>
          </>
        )}
        
        <div className="flex-1 h-px bg-border" />
        
        <div className={`flex items-center ${currentStep === 'processing' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'processing' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            {shouldShowDuplicateStep ? '3' : '2'}
          </div>
          <span className="ml-2">Processamento</span>
        </div>
        
        <div className="flex-1 h-px bg-border" />
        
        <div className={`flex items-center ${currentStep === 'review' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'review' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            {shouldShowDuplicateStep ? '4' : '3'}
          </div>
          <span className="ml-2">Revisão</span>
        </div>
        
        <div className="flex-1 h-px bg-border" />
        
        <div className={`flex items-center ${currentStep === 'results' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'results' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            {shouldShowDuplicateStep ? '5' : '4'}
          </div>
          <span className="ml-2">Resultados</span>
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 'upload' && (
        <div className="space-y-6">
          <BankSelector 
            value={selectedBank}
            onValueChange={setSelectedBank}
          />
          <CSVUploader 
            onDataParsed={(data, layoutType) => handleDataParsed(data, layoutType)}
            onError={(error) => {
              // console.error('CSV Upload Error:', error);
              toast({
                title: "Erro ao processar arquivo CSV",
                description: error,
                variant: "destructive"
              });
            }}
            selectedBankId={selectedBank}
          />
        </div>
      )}

      {currentStep === 'duplicate-analysis' && duplicateAnalysis && (
        <DuplicateAnalysisCard
          analysis={{
            totalNew: duplicateAnalysis.newTransactions.length,
            totalDuplicates: duplicateAnalysis.duplicates.length,
            duplicates: duplicateAnalysis.duplicates,
            newTransactions: duplicateAnalysis.newTransactions,
            refundedTransactions: [],
            unifiedPixTransactions: []
          }}
          selectedMode={selectedImportMode}
          onModeChange={setSelectedImportMode}
          onProceed={async () => {
            await handleDuplicateAnalysisComplete(
              [...duplicateAnalysis.newTransactions, ...duplicateAnalysis.duplicates.map(d => d.new)],
              selectedImportMode === 'new-only' ? 'import' : 
              selectedImportMode === 'update-existing' ? 'overwrite' : 'import'
            );
          }}
          onCancel={() => {
            setDuplicateAnalysis(null);
            setCurrentStep('upload');
          }}
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
              onTransactionsUpdate={setTransactions}
              layoutType={layoutType}
            />
        </div>
      )}

      {currentStep === 'results' && importResults && (
        <ImportResultsCard
          result={{
            successful: importResults.imported,
            failed: 0,
            skipped: importResults.skipped,
            updated: 0,
            total: importResults.imported + importResults.skipped,
            errors: importResults.errors
          }}
          onClose={resetImport}
        />
      )}

      {/* Loading Overlay */}
      <LoadingOverlay isVisible={isProcessing} />
    </div>
  );
}
