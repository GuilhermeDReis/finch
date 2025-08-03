import { supabase } from '@/integrations/supabase/client';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

interface CreditTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

interface CreditCategorization {
  id: string;
  categoryId: string | undefined;
  subcategoryId: string | undefined;
  confidence: number;
  reasoning: string;
  isAISuggested: boolean;
  usedFallback: boolean;
}

class CreditCardCategorizationService {
  private categories: Category[] = [];
  private subcategories: Subcategory[] = [];

  // Enhanced fallback patterns specific for credit card transactions
  private readonly creditCardFallbackPatterns = [
    // Food and dining - high priority for credit cards
    { keywords: ['restaurante', 'lanchonete', 'pizzaria', 'hamburgueria', 'padaria', 'cafeteria'], category: 'Alimentação', subcategory: 'Restaurante' },
    { keywords: ['supermercado', 'mercado', 'hortifruti', 'açougue'], category: 'Alimentação', subcategory: 'Supermercado' },
    { keywords: ['ifood', 'uber eats', 'delivery', 'rappi'], category: 'Alimentação', subcategory: 'Delivery' },
    { keywords: ['cafe', 'starbucks', 'cacau show'], category: 'Alimentação', subcategory: 'Café' },
    
    // Shopping - very common in credit cards
    { keywords: ['shopping', 'magazine', 'americanas', 'submarino', 'mercado livre'], category: 'Compras', subcategory: 'Online' },
    { keywords: ['zara', 'hm', 'c&a', 'renner', 'riachuelo'], category: 'Compras', subcategory: 'Roupas e Acessórios' },
    { keywords: ['farmacia', 'drogaria', 'drogasil', 'raia'], category: 'Saúde', subcategory: 'Medicamentos' },
    
    // Entertainment and services
    { keywords: ['cinema', 'teatro', 'show', 'ingresso'], category: 'Entretenimento', subcategory: 'Cinema/Teatro' },
    { keywords: ['netflix', 'spotify', 'amazon prime', 'disney'], category: 'Entretenimento', subcategory: 'Streaming' },
    { keywords: ['posto', 'gasolina', 'combustivel', 'shell', 'petrobras', 'ipiranga'], category: 'Transporte', subcategory: 'Combustível' },
    { keywords: ['uber', 'taxi', '99', 'cabify'], category: 'Transporte', subcategory: 'Transporte Público' },
    
    // Health & fitness
    { keywords: ['academia', 'gym', 'fitness', 'smart fit', 'bio ritmo'], category: 'Saúde', subcategory: 'Academia/Atividade Física' },
    { keywords: ['clinica', 'hospital', 'medico', 'dentista'], category: 'Saúde', subcategory: 'Consultas Médicas' },
    
    // Utilities & bills on credit card
    { keywords: ['telefone', 'celular', 'vivo', 'tim', 'claro', 'oi'], category: 'Contas', subcategory: 'Internet/Telefone' },
    { keywords: ['netflix', 'spotify', 'amazon', 'subscription'], category: 'Contas', subcategory: 'Assinaturas' },
    
    // Credit card specific
    { keywords: ['anuidade', 'tarifa', 'juros', 'iof'], category: 'Finanças', subcategory: 'Cartão de Crédito' },
    { keywords: ['pagamento', 'credito pago', 'quitacao'], category: 'Finanças', subcategory: 'Pagamento Cartão' },
    
    // Travel
    { keywords: ['hotel', 'pousada', 'booking', 'airbnb'], category: 'Viagem', subcategory: 'Hospedagem' },
    { keywords: ['passagem', 'aviao', 'onibus', 'rodoviaria'], category: 'Viagem', subcategory: 'Transporte' }
  ];

  /**
   * Load categories and subcategories from database
   */
  private async loadCategoriesAndSubcategories(): Promise<void> {
    try {
      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*');

      if (categoriesError) {
        console.error('❌ [CREDIT-LOCAL] Error loading categories:', categoriesError);
        throw categoriesError;
      }

      // Load subcategories
      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from('subcategories')
        .select('*');

      if (subcategoriesError) {
        console.error('❌ [CREDIT-LOCAL] Error loading subcategories:', subcategoriesError);
        throw subcategoriesError;
      }

      this.categories = categoriesData || [];
      this.subcategories = subcategoriesData || [];

      console.log('📊 [CREDIT-LOCAL] Loaded', this.categories.length, 'categories and', this.subcategories.length, 'subcategories');
    } catch (error) {
      console.error('💥 [CREDIT-LOCAL] Exception loading categories:', error);
      throw error;
    }
  }

  /**
   * Categorize credit card transactions using fallback patterns
   */
  private categorizeWithCreditFallback(transaction: CreditTransaction): CreditCategorization {
    const description = transaction.description.toLowerCase();
    
    // Skip categorization for negative amounts (bill payments)
    if (transaction.amount < 0) {
      console.log('💰 [CREDIT-LOCAL] Negative amount detected - skipping categorization for bill payment:', transaction.description);
      return {
        id: transaction.id,
        categoryId: undefined,
        subcategoryId: undefined,
        confidence: 0,
        reasoning: 'Pagamento de fatura - não categorizado',
        isAISuggested: false,
        usedFallback: false
      };
    }
    
    // Try credit card specific patterns first
    for (const pattern of this.creditCardFallbackPatterns) {
      if (pattern.keywords.some(keyword => description.includes(keyword))) {
        const category = this.categories.find(cat => cat.name === pattern.category);
        const subcategory = this.subcategories.find(sub => 
          sub.name === pattern.subcategory && sub.category_id === category?.id
        );
        
        if (category && subcategory) {
          console.log('✅ [CREDIT-LOCAL] Credit fallback match for', transaction.description, '→', pattern.category, '/', pattern.subcategory);
          return {
            id: transaction.id,
            categoryId: category.id,
            subcategoryId: subcategory.id,
            confidence: 0.8, // Higher confidence for credit card patterns
            reasoning: `Categorizado por padrão de cartão de crédito: ${pattern.keywords.find(k => description.includes(k))}`,
            isAISuggested: true,
            usedFallback: true
          };
        }
      }
    }
    
    // If no credit card specific match, use default
    const defaultCategory = this.categories.find(cat => cat.name === 'Compras');
    const defaultSubcategory = this.subcategories.find(sub => 
      sub.name === 'Diversos' && sub.category_id === defaultCategory?.id
    );
    
    return {
      id: transaction.id,
      categoryId: defaultCategory?.id || '',
      subcategoryId: defaultSubcategory?.id || '',
      confidence: 0.3,
      reasoning: 'Categoria padrão para cartão de crédito - não encontrado padrão específico',
      isAISuggested: true,
      usedFallback: true
    };
  }

  /**
   * Categorize multiple credit card transactions
   */
  async categorizeCreditTransactions(transactions: CreditTransaction[]): Promise<CreditCategorization[]> {
    console.log('💳 [CREDIT-LOCAL] Starting local credit card categorization for', transactions.length, 'transactions');
    
    try {
      // Load categories and subcategories
      await this.loadCategoriesAndSubcategories();
      
      // Categorize each transaction
      const categorizedTransactions = transactions.map(transaction => 
        this.categorizeWithCreditFallback(transaction)
      );

      console.log('✅ [CREDIT-LOCAL] Local credit card categorization completed for', categorizedTransactions.length, 'transactions');
      
      return categorizedTransactions;
    } catch (error) {
      console.error('💥 [CREDIT-LOCAL] Error in local credit card categorization:', error);
      throw error;
    }
  }
}

// Export a singleton instance
const creditCardCategorizationService = new CreditCardCategorizationService();
export default creditCardCategorizationService;
