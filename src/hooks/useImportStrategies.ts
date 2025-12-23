import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import transactionMappingService from '@/services/transactionMapping';
import creditCardCategorizationService from '@/services/creditCardCategorization';
import backgroundJobService from '@/services/backgroundJobService';
import { notificationService } from '@/services/notificationService';
import type { TransactionRow } from '@/types/transaction';
import { TransactionPersistenceSchema, CreditCardTransactionPersistenceSchema, type TransactionPersistenceData, type CreditCardTransactionPersistenceData } from '@/types/schemas';
import type { ImportJobPayload } from '@/services/backgroundJobService';
import { getLogger } from '@/utils/logger';
import type { ImportSession, ProcessingState } from '@/types/import';

const logger = getLogger('useImportStrategies');

// Utility function for UUID validation
const isValidUUID = (str: string | undefined | null): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return str ? uuidRegex.test(str) : false;
};

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
          const validation = TransactionPersistenceSchema.safeParse({
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
        .filter((t): t is TransactionPersistenceData => Boolean(t));

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

        if (existingTransaction) {
          // Update existing transaction
          const { error: updateError } = await supabase
            .from('transactions')
            .update({
              date: transaction.date,
              amount: transaction.amount,
              description: transaction.description,
              original_description: transaction.original_description,
              type: transaction.type,
              category_id: transaction.category_id,
              subcategory_id: transaction.subcategory_id
            })
            .eq('id', existingTransaction.id);

          if (updateError) {
            logger.error('Error updating transaction', { id: existingTransaction.id, error: updateError });
            throw updateError;
          }
        } else {
          // Insert new transaction
          const { error: insertError } = await supabase
            .from('transactions')
            .insert(transaction);

          if (insertError) {
            logger.error('Error inserting transaction', { transaction, error: insertError });
            throw insertError;
          }
        }

        const progress = Math.min(95, Math.round(30 + (index / validatedTransactions.length) * 60));
        setProcessingProgress(progress);
        setCurrentProcessingSubMessage(`Processando ${index + 1} de ${validatedTransactions.length}...`);
      }

      setProcessingProgress(95);
      setCurrentProcessingSubMessage('Concluindo importação...');

      toast({
        title: 'Importação concluída',
        description: `${validatedTransactions.length} transações processadas com sucesso.`
      });

      setProcessingProgress(100);
      setIsProcessing(false);
    } catch (error: any) {
      logger.error('Error importing bank transactions', { error });
      setIsProcessing(false);
      toast({
        title: 'Erro na importação',
        description: error.message || 'Ocorreu um erro ao importar as transações.',
        variant: 'destructive'
      });
      throw error;
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
      setCurrentProcessingMessage('Importando Transações de Cartão');
      setCurrentProcessingSubMessage('Validando dados...');

      const validatedTransactions = transactions
        .map(transaction => {
          const validation = CreditCardTransactionPersistenceSchema.safeParse({
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
        .filter((t): t is CreditCardTransactionPersistenceData => Boolean(t));

      if (validatedTransactions.length === 0) {
        throw new Error('Nenhuma transação válida para importar');
      }

      setProcessingProgress(30);
      setCurrentProcessingSubMessage('Salvando transações...');

      for (const [index, transaction] of validatedTransactions.entries()) {
        const { data: existingTransaction, error: checkError } = await supabase
          .from('transaction_credit')
          .select('id')
          .eq('external_id', transaction.external_id)
          .maybeSingle();

        if (checkError) {
          logger.error('Error checking existing credit transaction', { externalId: transaction.external_id, error: checkError });
          throw checkError;
        }

        if (existingTransaction) {
          const { error: updateError } = await supabase
            .from('transaction_credit')
            .update({
              date: transaction.date,
              amount: transaction.amount,
              description: transaction.description,
              original_description: transaction.original_description,
              type: transaction.type,
              category_id: transaction.category_id,
              subcategory_id: transaction.subcategory_id
            })
            .eq('id', existingTransaction.id);

          if (updateError) {
            logger.error('Error updating credit card transaction', { id: existingTransaction.id, error: updateError });
            throw updateError;
          }
        } else {
          const { error: insertError } = await supabase
            .from('transaction_credit')
            .insert(transaction);

          if (insertError) {
            logger.error('Error inserting credit card transaction', { transaction, error: insertError });
            throw insertError;
          }
        }

        const progress = Math.min(95, Math.round(30 + (index / validatedTransactions.length) * 60));
        setProcessingProgress(progress);
        setCurrentProcessingSubMessage(`Processando ${index + 1} de ${validatedTransactions.length}...`);
      }

      setProcessingProgress(95);
      setCurrentProcessingSubMessage('Concluindo importação...');

      toast({
        title: 'Importação de cartão concluída',
        description: `${validatedTransactions.length} transações de cartão processadas com sucesso.`
      });

      setProcessingProgress(100);
      setIsProcessing(false);
    } catch (error: any) {
      logger.error('Error importing credit card transactions', { error });
      setIsProcessing(false);
      toast({
        title: 'Erro na importação',
        description: error.message || 'Ocorreu um erro ao importar as transações do cartão.',
        variant: 'destructive'
      });
      throw error;
    }
  }, [toast]);

  /**
   * Run AI categorization on transactions using mapping and credit card context
   */
  const runAICategorization = useCallback(async (
    transactions: TransactionRow[],
    user: any,
    _processingState: ProcessingState,
    layoutType: 'bank' | 'credit_card'
  ) => {
    try {
      const mappingType = layoutType === 'credit_card' ? 'credit_card' : 'bank';
      const { mappedTransactions, unmappedTransactions } = await transactionMappingService.applyMappingsToTransactions(
        transactions,
        user.id,
        mappingType
      );

      let updatedUnmapped: TransactionRow[] = unmappedTransactions as TransactionRow[];

      // For credit card transactions, apply credit card-specific categorization using local fallback rules
      if (mappingType === 'credit_card' && unmappedTransactions.length > 0) {
        const ccInput = (unmappedTransactions as TransactionRow[]).map(t => ({
          id: t.id,
          description: t.editedDescription || t.description,
          amount: t.amount,
          type: t.type
        }));

        const creditCardCategorizations = await creditCardCategorizationService.categorizeCreditTransactions(ccInput);
        const byId = new Map(creditCardCategorizations.map(c => [c.id, c]));

        updatedUnmapped = (unmappedTransactions as TransactionRow[]).map(t => {
          const c = byId.get(t.id);
          if (!c) return t;
          return {
            ...t,
            aiSuggestion: {
              categoryId: c.categoryId || '',
              confidence: c.confidence,
              reasoning: c.reasoning,
              isAISuggested: c.isAISuggested,
              usedFallback: c.usedFallback
            }
          } as TransactionRow;
        });
      }

      return [...(mappedTransactions as TransactionRow[]), ...updatedUnmapped];
    } catch (error: any) {
      logger.error('Error during AI categorization', { error });
      throw error;
    }
  }, []);

  /**
   * Start background import job on server
   */
  const startBackgroundImport = useCallback(async (
    payload: ImportJobPayload
  ) => {
    try {
      const job = await backgroundJobService.createImportJob(payload);
      if (job) {
        await notificationService.createBackgroundJobNotification(
          'Importação iniciada',
          'Processamento em segundo plano iniciado. Você será notificado ao concluir.',
          'info',
          job.id,
          {
            totalTransactions: Array.isArray(payload?.transactions) ? payload.transactions.length : undefined,
            layoutType: payload?.layoutType,
            importMode: payload?.importMode,
          }
        );
      }
      return job;
    } catch (error: any) {
      logger.error('Error starting background job', { error });
      throw error;
    }
  }, []);

  return {
    importBankTransactions,
    importCreditCardTransactions,
    runAICategorization,
    startBackgroundImport
  };
}