import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import transactionMappingService from '@/services/transactionMapping';
import creditCardCategorizationService from '@/services/creditCardCategorization';
import backgroundJobService from '@/services/backgroundJobService';
import { notificationService } from '@/services/notificationService';
import type { TransactionRow } from '@/types/transaction';
import { BankTransactionSchema, CreditCardTransactionSchema } from '@/types/schemas';
import { getLogger } from '@/utils/logger';

const logger = getLogger('useImportStrategies');

// Utility function for UUID validation
const isValidUUID = (str: string | undefined | null): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return str ? uuidRegex.test(str) : false;
};

// Interface for import session
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

// Interface for processing state
interface ProcessingState {
  setIsProcessing: (processing: boolean) => void;
  setProcessingProgress: (progress: number) => void;
  setCurrentProcessingMessage: (message: string) => void;
  setCurrentProcessingSubMessage: (message: string) => void;
}

/**
 * Hook para estratégias de importação por tipo de layout
 * Centraliza a lógica específica para banco vs cartão de crédito
 */
export function useImportStrategies() {
  const { toast } = useToast();

  /**
   * Strategy for bank transaction imports
   */
  const importBankTransactions = useCallback(async (
    transactions: TransactionRow[],
    selectedBank: string,
    importSession: ImportSession,
    user: any,
    processingState: ProcessingState
  ) => {
    const { setIsProcessing, setProcessingProgress, setCurrentProcessingMessage, setCurrentProcessingSubMessage } = processingState;
    
    try {
      setIsProcessing(true);
      setProcessingProgress(10);
      setCurrentProcessingMessage('Importando Transações Bancárias');
      setCurrentProcessingSubMessage('Validando dados...');

      // Validate transactions using Zod schema
      const validatedTransactions = transactions
        .map(transaction => {
          const validation = BankTransactionSchema.safeParse({
            date: transaction.date,
            amount: transaction.amount,
            description: transaction.editedDescription || transaction.description,
            original_description: transaction.originalDescription,
            external_id: transaction.id,
            type: transaction.type,
            category_id: isValidUUID(transaction.categoryId) ? transaction.categoryId : null,
            subcategory_id: isValidUUID(transaction.subcategoryId) ? transaction.subcategoryId : null,
            bank_id: selectedBank,
            import_session_id: importSession.id,
            user_id: user.id
          });

          if (!validation.success) {
            logger.warn('Transaction validation failed', {
              transactionId: transaction.id,
              errors: validation.error.errors
            });
            return null;
          }

          return validation.data;
        })
        .filter(Boolean);

      if (validatedTransactions.length === 0) {
        throw new Error('Nenhuma transação válida para importar');
      }

      logger.info('Importing bank transactions', { 
        totalTransactions: validatedTransactions.length,
        sessionId: importSession.id 
      });

      setProcessingProgress(30);
      setCurrentProcessingSubMessage('Salvando transações...');

      // Import transactions with proper duplicate handling
      for (const [index, transaction] of validatedTransactions.entries()) {
        // Check if transaction already exists
        const { data: existingTransaction, error: checkError } = await supabase
          .from('transactions')
          .select('id')
          .eq('external_id', transaction.external_id)
          .maybeSingle();

        if (checkError) {
          logger.error('Error checking existing transaction', { 
            externalId: transaction.external_id, 
            error: checkError 
          });
          throw checkError;
        }

        let result;
        if (existingTransaction) {
          // Update existing transaction
          result = await supabase
            .from('transactions')
            .update(transaction)
            .eq('external_id', transaction.external_id)
            .select()
            .single();
        } else {
          // Insert new transaction
          result = await supabase
            .from('transactions')
            .insert(transaction)
            .select()
            .single();
        }

        if (result.error) {
          logger.error('Error saving transaction', { 
            transaction: transaction.external_id, 
            error: result.error 
          });
          throw result.error;
        }

        // Update progress
        const progress = 30 + (index / validatedTransactions.length) * 60;
        setProcessingProgress(Math.round(progress));
      }

      setProcessingProgress(90);
      setCurrentProcessingSubMessage('Finalizando importação...');

      // Update import session
      await supabase
        .from('import_sessions')
        .update({
          status: 'completed',
          processed_records: validatedTransactions.length,
          completed_at: new Date().toISOString()
        })
        .eq('id', importSession.id);

      setProcessingProgress(100);

      toast({
        title: "Sucesso!",
        description: `${validatedTransactions.length} transações bancárias importadas com sucesso`,
        variant: "default"
      });

      return { success: true, count: validatedTransactions.length };

    } catch (error) {
      logger.error('Error in bank transaction import', { error });
      
      // Update session with error
      await supabase
        .from('import_sessions')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', importSession.id);

      toast({
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao importar as transações bancárias",
        variant: "destructive"
      });

      return { success: false, error };
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  /**
   * Strategy for credit card transaction imports
   */
  const importCreditCardTransactions = useCallback(async (
    transactions: TransactionRow[],
    selectedBank: string,
    selectedCreditCardId: string,
    importSession: ImportSession,
    user: any,
    processingState: ProcessingState
  ) => {
    const { setIsProcessing, setProcessingProgress, setCurrentProcessingMessage, setCurrentProcessingSubMessage } = processingState;
    
    try {
      setIsProcessing(true);
      setProcessingProgress(10);
      setCurrentProcessingMessage('Importando Transações de Crédito');
      setCurrentProcessingSubMessage('Validando dados...');

      // Filter out informative transactions and validate required categories
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
        throw new Error(`Existem ${creditCardTransactionsMissingCategory.length} transações de crédito sem categoria ou subcategoria definida. Por favor, atribua categorias antes de importar (exceto pagamentos informativos).`);
      }

      setProcessingProgress(20);
      setCurrentProcessingSubMessage('Preparando transações para importação...');

      // Validate transactions using Zod schema
      const validatedTransactions = transactions
        .map(transaction => {
          const validation = CreditCardTransactionSchema.safeParse({
            date: transaction.date,
            amount: transaction.amount,
            description: transaction.editedDescription || transaction.description,
            original_description: transaction.originalDescription,
            external_id: transaction.id,
            credit_card_id: selectedCreditCardId,
            type: transaction.type,
            category_id: isValidUUID(transaction.categoryId) ? transaction.categoryId : null,
            subcategory_id: isValidUUID(transaction.subcategoryId) ? transaction.subcategoryId : null,
            bank_id: selectedBank,
            import_session_id: importSession.id,
            user_id: user.id
          });

          if (!validation.success) {
            logger.warn('Credit card transaction validation failed', {
              transactionId: transaction.id,
              errors: validation.error.errors
            });
            return null;
          }

          return validation.data;
        })
        .filter(Boolean);

      if (validatedTransactions.length === 0) {
        throw new Error('Nenhuma transação de crédito válida para importar');
      }

      logger.info('Importing credit card transactions', { 
        totalTransactions: validatedTransactions.length,
        sessionId: importSession.id 
      });

      setProcessingProgress(40);
      setCurrentProcessingSubMessage('Salvando no banco de dados...');

      // Import transactions with proper duplicate handling
      for (const [index, transaction] of validatedTransactions.entries()) {
        // Check if transaction already exists
        const { data: existingTransaction, error: checkError } = await supabase
          .from('transaction_credit')
          .select('id')
          .eq('external_id', transaction.external_id)
          .maybeSingle();

        if (checkError) {
          logger.error('Error checking existing credit card transaction', { 
            externalId: transaction.external_id, 
            error: checkError 
          });
          throw checkError;
        }

        let result;
        if (existingTransaction) {
          // Update existing transaction
          result = await supabase
            .from('transaction_credit')
            .update(transaction)
            .eq('external_id', transaction.external_id)
            .select()
            .single();
        } else {
          // Insert new transaction
          result = await supabase
            .from('transaction_credit')
            .insert(transaction)
            .select()
            .single();
        }

        if (result.error) {
          logger.error('Error saving credit card transaction', { 
            transaction: transaction.external_id, 
            error: result.error 
          });
          throw result.error;
        }

        // Update progress
        const progress = 40 + (index / validatedTransactions.length) * 50;
        setProcessingProgress(Math.round(progress));
      }

      setProcessingProgress(90);
      setCurrentProcessingSubMessage('Finalizando importação...');

      // Update import session
      await supabase
        .from('import_sessions')
        .update({
          status: 'completed',
          processed_records: validatedTransactions.length,
          completed_at: new Date().toISOString()
        })
        .eq('id', importSession.id);

      setProcessingProgress(100);

      toast({
        title: "Sucesso!",
        description: `${validatedTransactions.length} transações de crédito importadas com sucesso`,
        variant: "default"
      });

      return { success: true, count: validatedTransactions.length };

    } catch (error) {
      logger.error('Error in credit card transaction import', { error });
      
      // Update session with error
      await supabase
        .from('import_sessions')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', importSession.id);

      toast({
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao importar as transações de crédito",
        variant: "destructive"
      });

      return { success: false, error };
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  /**
   * Strategy for AI categorization
   */
  const runAICategorization = useCallback(async (
    transactions: TransactionRow[],
    layoutType: 'bank' | 'credit_card',
    importSession: ImportSession,
    processingState: ProcessingState
  ) => {
    const { setProcessingProgress, setCurrentProcessingMessage, setCurrentProcessingSubMessage } = processingState;
    
    try {
      setProcessingProgress(10);
      setCurrentProcessingMessage('Categorizando com IA');
      setCurrentProcessingSubMessage('Iniciando categorização automática...');

      let aiSuggestions: any[] = [];

      if (layoutType === 'credit_card') {
        // Use credit card categorization service
        setCurrentProcessingSubMessage('Categorizando transações de crédito...');
        aiSuggestions = await creditCardCategorizationService.categorizeTransactions(
          transactions,
          importSession.id
        );
      } else {
        // Use bank transaction mapping service
        setCurrentProcessingSubMessage('Categorizando transações bancárias...');
        aiSuggestions = await transactionMappingService.categorizeTransactions(
          transactions,
          importSession.id
        );
      }

      setProcessingProgress(80);
      setCurrentProcessingSubMessage('Aplicando sugestões de categoria...');

      // Apply AI suggestions to transactions
      const categorizedTransactions = transactions.map(transaction => {
        const aiSuggestion = aiSuggestions.find(suggestion => 
          suggestion.external_id === transaction.id || suggestion.transactionId === transaction.id
        );

        if (aiSuggestion) {
          return {
            ...transaction,
            categoryId: aiSuggestion.categoryId,
            subcategoryId: aiSuggestion.subcategoryId,
            aiSuggestion: {
              categoryId: aiSuggestion.categoryId,
              subcategoryId: aiSuggestion.subcategoryId,
              confidence: aiSuggestion.confidence,
              reasoning: aiSuggestion.reasoning,
              isAISuggested: true
            }
          };
        }
        
        return transaction;
      });

      setProcessingProgress(100);
      return categorizedTransactions;

    } catch (error) {
      logger.error('Error in AI categorization', { error });
      
      // Update session with error
      await supabase
        .from('import_sessions')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', importSession.id);

      throw error;
    }
  }, []);

  /**
   * Strategy for background job processing
   */
  const startBackgroundImport = useCallback(async (
    transactions: TransactionRow[],
    selectedBank: string,
    selectedCreditCardId: string | undefined,
    layoutType: 'bank' | 'credit_card',
    importMode: 'new-only' | 'update-existing' | 'import-all',
    user: any
  ) => {
    try {
      logger.info('Starting background import job', {
        transactionCount: transactions.length,
        layoutType,
        importMode
      });

      const jobResult = await backgroundJobService.createImportJob({
        transactions,
        selectedBank,
        selectedCreditCardId,
        layoutType,
        importMode
      }, user.id);

      // Create notification for job start
      await notificationService.createBackgroundJobNotification(
        "Importação em segundo plano iniciada",
        `Processando ${transactions.length} transações`,
        "info",
        jobResult.job.id,
        {
          transactionCount: transactions.length,
          layoutType,
          importMode
        }
      );

      return { success: true, jobId: jobResult.job.id };

    } catch (error) {
      logger.error('Error starting background import', { error });
      
      // Create error notification
      await notificationService.createBackgroundJobNotification(
        "Erro no processamento em background",
        "Ocorreu um erro ao iniciar o processamento em segundo plano",
        "error",
        "unknown",
        {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      );

      return { success: false, error };
    }
  }, []);

  return {
    importBankTransactions,
    importCreditCardTransactions,
    runAICategorization,
    startBackgroundImport
  };
}