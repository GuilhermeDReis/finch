import type { TransactionRow } from '@/types/transaction';
import type { SimplifiedDetectionResult } from '@/services/duplicateDetection';

/**
 * Interface para transação unificada que representa grupos de transações relacionadas
 */
export interface UnifiedTransaction extends TransactionRow {
  /**
   * Status da transação unificada
   */
  status: 'refunded' | 'unified-pix' | 'normal';
  
  /**
   * IDs das transações originais que foram agrupadas
   */
  groupedTransactionIds?: string[];
  
  /**
   * Tipo do agrupamento para controle interno
   */
  groupType?: 'refund' | 'pix-credit';
}

/**
 * Cria transações unificadas a partir dos resultados de detecção de duplicatas
 * Centraliza a lógica que estava duplicada em ImportExtract.tsx
 * 
 * @param duplicateResults - Resultado da detecção de duplicatas
 * @returns Array de transações unificadas prontas para processamento
 */
export function createUnifiedTransactions(
  duplicateResults: SimplifiedDetectionResult
): UnifiedTransaction[] {
  const unifiedTransactions: UnifiedTransaction[] = [
    // Transações novas (sem duplicatas)
    ...duplicateResults.newTransactions.map(transaction => ({
      ...transaction,
      status: 'normal' as const
    })),
    
    // Transações de estorno unificadas
    ...duplicateResults.refundPairs.map(pair => ({
      id: pair.id,
      date: pair.originalTransaction.date,
      amount: pair.originalTransaction.amount, // Valor original (não zero)
      description: `Estorno Total: ${pair.originalTransaction.description}`,
      originalDescription: pair.originalTransaction.originalDescription || pair.originalTransaction.description,
      type: pair.originalTransaction.type,
      status: 'refunded' as const,
      selected: true,
      categoryId: undefined, // Sem categoria para estornos
      subcategoryId: undefined,
      aiSuggestion: undefined, // Sem sugestão de IA para estornos
      groupedTransactionIds: [pair.originalTransaction.id, pair.refundTransaction.id],
      groupType: 'refund' as const
    })),
    
    // Transações PIX unificadas
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
      subcategoryId: pair.pixTransaction.subcategoryId,
      groupedTransactionIds: [pair.pixTransaction.id, pair.creditTransaction.id],
      groupType: 'pix-credit' as const
    }))
  ];

  return unifiedTransactions;
}

/**
 * Cria transações unificadas para análise de duplicatas
 * Versão específica para quando há duplicatas que requerem decisão do usuário
 * 
 * @param duplicateResults - Resultado da detecção de duplicatas
 * @param selectedTransactions - Transações selecionadas pelo usuário
 * @param action - Ação escolhida pelo usuário ('import' | 'skip' | 'overwrite')
 * @returns Array de transações unificadas baseado na ação do usuário
 */
export function createUnifiedTransactionsForDuplicateAnalysis(
  duplicateResults: SimplifiedDetectionResult,
  selectedTransactions: TransactionRow[],
  action: 'import' | 'skip' | 'overwrite'
): UnifiedTransaction[] {
  if (action === 'skip') {
    return [];
  }

  const unifiedTransactions: UnifiedTransaction[] = [
    // Sempre incluir transações novas
    ...duplicateResults.newTransactions.map(transaction => ({
      ...transaction,
      status: 'normal' as const
    })),
    
    // Transações de estorno (sempre incluídas)
    ...duplicateResults.refundPairs.map(pair => ({
      id: pair.id,
      date: pair.originalTransaction.date,
      amount: pair.originalTransaction.amount,
      description: `Estorno Total: ${pair.originalTransaction.description}`,
      originalDescription: pair.originalTransaction.originalDescription || pair.originalTransaction.description,
      type: pair.originalTransaction.type,
      status: 'refunded' as const,
      selected: true,
      categoryId: undefined,
      subcategoryId: undefined,
      aiSuggestion: undefined,
      groupedTransactionIds: [pair.originalTransaction.id, pair.refundTransaction.id],
      groupType: 'refund' as const
    })),
    
    // Transações PIX (sempre incluídas)
    ...duplicateResults.pixPairs.map(pair => ({
      id: pair.id,
      date: pair.pixTransaction.date,
      amount: pair.pixTransaction.amount,
      description: `PIX Crédito: ${pair.pixTransaction.description}`,
      originalDescription: pair.pixTransaction.originalDescription || pair.pixTransaction.description,
      type: pair.pixTransaction.type,
      status: 'unified-pix' as const,
      selected: true,
      categoryId: pair.pixTransaction.categoryId,
      subcategoryId: pair.pixTransaction.subcategoryId,
      groupedTransactionIds: [pair.pixTransaction.id, pair.creditTransaction.id],
      groupType: 'pix-credit' as const
    }))
  ];

  return unifiedTransactions;
}

/**
 * Prepara transações duplicadas com dados existentes para modo 'update-existing'
 * 
 * @param duplicates - Array de duplicatas detectadas
 * @returns Array de transações com dados existentes aplicados
 */
export function prepareDuplicatesWithExistingData(
  duplicates: Array<{
    existing: any;
    new: TransactionRow;
    similarity: number;
    reasons: string[];
  }>
): TransactionRow[] {
  return duplicates.map(duplicate => {
    const existingTransaction = duplicate.existing;
    
    return {
      ...duplicate.new,
      // Usar categorias existentes do banco de dados
      categoryId: existingTransaction.category_id || duplicate.new.categoryId,
      subcategoryId: existingTransaction.subcategory_id || duplicate.new.subcategoryId,
      // Marcar como usando dados existentes
      aiSuggestion: {
        categoryId: existingTransaction.category_id,
        subcategoryId: existingTransaction.subcategory_id,
        confidence: 1.0,
        reasoning: 'Categorização existente do banco de dados',
        isAISuggested: false
      }
    };
  });
}

/**
 * Valida a integridade de transações unificadas
 * Garante que estornos não tenham categorias e que dados estejam consistentes
 * 
 * @param unifiedTransactions - Array de transações unificadas
 * @returns Objeto com resultado da validação e erros encontrados
 */
export function validateUnifiedTransactions(
  unifiedTransactions: UnifiedTransaction[]
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Verificar se estornos não têm categorias
  const refundsWithCategories = unifiedTransactions.filter(t => 
    t.status === 'refunded' && (t.categoryId || t.subcategoryId)
  );
  
  if (refundsWithCategories.length > 0) {
    errors.push(`${refundsWithCategories.length} estornos com categorias atribuídas (devem ser sem categoria)`);
  }

  // Verificar transações PIX têm os dados necessários
  const pixWithoutData = unifiedTransactions.filter(t => 
    t.status === 'unified-pix' && (!t.groupedTransactionIds || t.groupedTransactionIds.length !== 2)
  );
  
  if (pixWithoutData.length > 0) {
    warnings.push(`${pixWithoutData.length} transações PIX sem dados de agrupamento completos`);
  }

  // Verificar IDs únicos
  const ids = unifiedTransactions.map(t => t.id);
  const uniqueIds = new Set(ids);
  
  if (ids.length !== uniqueIds.size) {
    errors.push('IDs duplicados encontrados nas transações unificadas');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}