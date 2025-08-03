import { supabase } from '@/integrations/supabase/client';

export interface TransactionMapping {
  id: string;
  standardizedIdentifier: string;
  userId: string;
  categoryId: string;
  subcategoryId: string;
  confidenceScore: number;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMappingData {
  standardizedIdentifier: string;
  userId: string;
  categoryId: string;
  subcategoryId: string;
  confidenceScore: number;
  source: string;
  mappingType?: 'bank' | 'credit_card';
}

export interface UpdateMappingData {
  categoryId: string;
  subcategoryId: string;
  confidenceScore: number;
  source: string;
  mappingType?: 'bank' | 'credit_card';
}

export interface FindMappingResult {
  found: boolean;
  mapping?: TransactionMapping;
}

class TransactionMappingService {
  /**
   * Extracts and normalizes counterparty identifier from transaction description
   * Priority: CPF/CNPJ > Random PIX Key > Phone/Email PIX Key > Bank Details > Counterparty Name
   */
  private extractCounterpartyIdentifier(description: string): { identifier: string | null; name: string | null; bankDetails: string | null } {
    if (!description) return { identifier: null, name: null, bankDetails: null };

    // Remove special characters and normalize
    const cleanDescription = description
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^\w\s\-\.\@\(\)\d]/g, ' ') // Keep alphanumeric, spaces, hyphens, dots, @, (), digits
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // // console.log('🔍 [EXTRACT] Cleaned description:', cleanDescription);

    // 1. Try to extract CPF/CNPJ (highest priority)
    // CPF pattern: XXX.XXX.XXX-XX or XXXXXXXXXXX
    // CNPJ pattern: XX.XXX.XXX/XXXX-XX or XXXXXXXXXXXXXX
    const cpfCnpjRegex = /(?:\b|\D)(\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})(?:\b|\D)/gi;
    let cpfCnpjMatch;
    while ((cpfCnpjMatch = cpfCnpjRegex.exec(cleanDescription)) !== null) {
      const cpfCnpj = cpfCnpjMatch[1].replace(/\D/g, ''); // Remove all non-digits
      if (cpfCnpj.length === 11 || cpfCnpj.length === 14) { // Valid CPF (11) or CNPJ (14)
        // Extract name (text before CPF/CNPJ)
        const nameMatch = cleanDescription.substring(0, cpfCnpjMatch.index).match(/([A-Za-zÀ-ÿ\s]+)$/);
        const name = nameMatch ? nameMatch[1].trim() : null;
        // // console.log('✅ [EXTRACT] Found CPF/CNPJ:', { cpfCnpj, name });
        return { 
          identifier: cpfCnpj, 
          name: name ? this.normalizeString(name) : null,
          bankDetails: null
        };
      }
    }

    // 2. Try to extract UUID PIX Key (random key)
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    let uuidMatch;
    while ((uuidMatch = uuidRegex.exec(cleanDescription)) !== null) {
      // Extract name (text before UUID)
      const nameMatch = cleanDescription.substring(0, uuidMatch.index).match(/([A-Za-zÀ-ÿ\s]+)$/);
      const name = nameMatch ? nameMatch[1].trim() : null;
      // // console.log('✅ [EXTRACT] Found UUID PIX:', { uuid: uuidMatch[0].toLowerCase(), name });
      return { 
        identifier: uuidMatch[0].toLowerCase(), 
        name: name ? this.normalizeString(name) : null,
        bankDetails: null
      };
    }

    // 3. Try to extract Phone or Email PIX Key
    // Phone pattern (Brazilian): (XX) XXXXX-XXXX or similar
    const phoneRegex = /[\d\-\(\)\s]{10,}/g;
    let phoneMatch;
    while ((phoneMatch = phoneRegex.exec(cleanDescription)) !== null) {
      const phoneClean = phoneMatch[0].replace(/\D/g, '');
      if (phoneClean.length >= 10 && phoneClean.length <= 11) { // Valid Brazilian phone
        // Extract name (text before phone)
        const nameMatch = cleanDescription.substring(0, phoneMatch.index).match(/([A-Za-zÀ-ÿ\s]+)$/);
        const name = nameMatch ? nameMatch[1].trim() : null;
        // // console.log('✅ [EXTRACT] Found Phone PIX:', { phone: phoneClean, name });
        return { 
          identifier: phoneClean, 
          name: name ? this.normalizeString(name) : null,
          bankDetails: null
        };
      }
    }

    // Email pattern
    const emailRegex = /[\w\.\-]+@[\w\.\-]+\.\w+/gi;
    let emailMatch;
    while ((emailMatch = emailRegex.exec(cleanDescription)) !== null) {
      // Extract name (text before email)
      const nameMatch = cleanDescription.substring(0, emailMatch.index).match(/([A-Za-zÀ-ÿ\s]+)$/);
      const name = nameMatch ? nameMatch[1].trim() : null;
      // // console.log('✅ [EXTRACT] Found Email PIX:', { email: emailMatch[0].toLowerCase(), name });
      return { 
        identifier: emailMatch[0].toLowerCase(), 
        name: name ? this.normalizeString(name) : null,
        bankDetails: null
      };
    }

    // 4. Try to extract Bank Details (Bank, Agency, Account)
    const bankDetailsRegex = /(\w+)\s*\([^)]+\)\s*Ag[^:]*:\s*([\d\-]+)\s*Conta:\s*([\d\-]+)/i;
    const bankDetailsMatch = bankDetailsRegex.exec(cleanDescription);
    if (bankDetailsMatch) {
      const bank = bankDetailsMatch[1];
      const agency = bankDetailsMatch[2].replace(/\D/g, '');
      const account = bankDetailsMatch[3].replace(/\D/g, '');
      const bankDetails = `${this.normalizeString(bank)}-${agency}-${account}`;
      
      // Extract name (text before bank details)
      const nameMatch = cleanDescription.substring(0, bankDetailsMatch.index).match(/([A-Za-zÀ-ÿ\s]+)$/);
      const name = nameMatch ? nameMatch[1].trim() : null;
      // // console.log('✅ [EXTRACT] Found Bank Details:', { bankDetails, name });
      return { 
        identifier: bankDetails, 
        name: name ? this.normalizeString(name) : null,
        bankDetails: bankDetails
      };
    }

    // 5. Extract Counterparty Name (fallback)
    // Look for names at the beginning or after transaction type keywords
    const nameRegex = /(?:^|pix|transfer|pagamento|compra|saque|deposito)\s+([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)*)/i;
    const nameMatch = nameRegex.exec(cleanDescription);
    if (nameMatch) {
      const name = nameMatch[1].trim();
      // // console.log('✅ [EXTRACT] Found Counterparty Name:', name);
      return { 
        identifier: null, 
        name: this.normalizeString(name),
        bankDetails: null
      };
    }

    // // console.log('⚠️ [EXTRACT] No counterparty identifier found');
    return { identifier: null, name: null, bankDetails: null };
  }

  /**
   * Normalizes a string by removing accents, special characters, and converting to lowercase
   */
  private normalizeString(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\-]/g, ' ') // Remove special characters but keep spaces and hyphens
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Standardizes a transaction description to create a consistent identifier
   * for mapping transactions to categories
   * Format: [TRANSACTION_TYPE] - [COUNTERPARTY_NAME] - [COUNTERPARTY_IDENTIFIER] - [BANK_DETAILS]
   */
  standardizeIdentifier(description: string): string {
    if (!description) return '';

    // Extract transaction type/purpose (more comprehensive)
    let transactionType = this.normalizeString(description);
    
    // Remove common prefixes/suffixes
    transactionType = transactionType
      .replace(/^(pix|ted|doc|transferencia|transfer|pagamento|compra|saque|deposito|recebido|enviado)\s*/i, '')
      .replace(/\s*(pix|ted|doc|transferencia|transfer|pagamento|compra|saque|deposito|recebido|enviado)$/i, '')
      .trim();
    
    // Remove dates, times, and long numbers
    transactionType = transactionType
      .replace(/\d{2}\/\d{2}\/\d{4}/g, '') // Dates
      .replace(/\d{2}:\d{2}:\d{2}/g, '') // Times
      .replace(/\b\d{10,}\b/g, '') // Long numbers (IDs, account numbers)
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Remove CPF/CNPJ patterns
    transactionType = transactionType
      .replace(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, '') // CPF
      .replace(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g, '') // CNPJ
      .replace(/\s+/g, ' ') // Normalize whitespace again
      .trim();

    // Extract counterparty information
    const counterpartyInfo = this.extractCounterpartyIdentifier(description);
    
    // Build standardized identifier with consistent order:
    // [TRANSACTION_TYPE] - [COUNTERPARTY_NAME] - [COUNTERPARTY_IDENTIFIER] - [BANK_DETAILS]
    const components = [];
    
    // Add transaction type (always first if not empty)
    if (transactionType) {
      components.push(transactionType);
    }
    
    // Add counterparty name (if available)
    if (counterpartyInfo.name) {
      components.push(counterpartyInfo.name);
    }
    
    // Add counterparty identifier (highest priority first)
    if (counterpartyInfo.identifier) {
      components.push(counterpartyInfo.identifier);
    }
    
    // Add bank details (if available and no other identifier found)
    if (counterpartyInfo.bankDetails && !counterpartyInfo.identifier) {
      components.push(counterpartyInfo.bankDetails);
    }
    
    // Filter out empty components and join
    const result = components.filter(c => c && c.length > 0).join(' - ');
    // // console.log('🔍 [MAPPING] Standardized identifier for:', { 
    // //   original: description, 
    // //   standardized: result,
    //   components: {
    //     transactionType,
    //     name: counterpartyInfo.name,
    //     identifier: counterpartyInfo.identifier,
    //     bankDetails: counterpartyInfo.bankDetails
    //   }
    // });
    return result;
  }

  /**
   * Finds an existing mapping for a given standardized identifier and user
   * Now includes mapping_type to differentiate between credit and bank transactions
   */
  async findMapping(standardizedIdentifier: string, userId: string, mappingType: 'bank' | 'credit_card' = 'bank'): Promise<FindMappingResult> {
    try {
      // // console.log('🔍 [MAPPING] Searching for mapping with:', { standardizedIdentifier, userId, mappingType });
      
      // First, try to search with mapping_type
      let { data, error } = await supabase
        .from('transaction_mappings')
        .select('*')
        .eq('standardized_identifier', standardizedIdentifier)
        .eq('user_id', userId)
        .eq('mapping_type', mappingType)
        .maybeSingle();

      // If error is about mapping_type field not existing, try without it
      if (error && (error.message?.includes('mapping_type') || error.code === '42703')) {
        console.log('🔄 [MAPPING] mapping_type field not found, searching without it');
        const { data: retryData, error: retryError } = await supabase
          .from('transaction_mappings')
          .select('*')
          .eq('standardized_identifier', standardizedIdentifier)
          .eq('user_id', userId)
          .maybeSingle();

        if (retryError) {
          console.error('❌ [MAPPING] Error finding transaction mapping (retry):', retryError);
          return { found: false };
        }

        data = retryData;
        error = retryError;
      }

      if (error) {
        console.error('❌ [MAPPING] Error finding transaction mapping:', error);
        return { found: false };
      }

      if (!data) {
        // // console.log('⚠️ [MAPPING] No mapping found for:', { standardizedIdentifier, userId, mappingType });
        return { found: false };
      }

      // // console.log('✅ [MAPPING] Found mapping:', data);
      return {
        found: true,
        mapping: {
          id: data.id,
          standardizedIdentifier: data.standardized_identifier,
          userId: data.user_id,
          categoryId: data.category_id,
          subcategoryId: data.subcategory_id,
          confidenceScore: data.confidence_score,
          source: data.source,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }
      };
    } catch (error) {
      console.error('Exception in findMapping:', error);
      return { found: false };
    }
  }

  /**
   * Creates a new transaction mapping
   */
  async createMapping(data: CreateMappingData): Promise<TransactionMapping | null> {
    try {
      // // console.log('🔍 [MAPPING] Creating mapping with data:', data);
      
      // First, check if a mapping already exists to avoid duplicate key errors
      const existingMappingResponse = await this.findMapping(data.standardizedIdentifier, data.userId, data.mappingType);
      if (existingMappingResponse.found) {
        console.log('🔄 [MAPPING] Mapping already exists, updating instead of creating');
        return this.updateMapping(existingMappingResponse.mapping!.id, {
          categoryId: data.categoryId,
          subcategoryId: data.subcategoryId,
          confidenceScore: data.confidenceScore,
          source: data.source,
          mappingType: data.mappingType || 'bank'
        });
      }
      
      // First, try to create with mapping_type field
      let insertData: any = {
        standardized_identifier: data.standardizedIdentifier,
        user_id: data.userId,
        category_id: data.categoryId,
        subcategory_id: data.subcategoryId,
        confidence_score: data.confidenceScore,
        source: data.source,
        original_description: data.standardizedIdentifier || '' // Campo obrigatório conforme schema
      };

      // Try to add mapping_type if it exists in the schema
      if (data.mappingType) {
        insertData.mapping_type = data.mappingType;
      }

      const { data: result, error } = await supabase
        .from('transaction_mappings')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        // If error is about mapping_type field not existing, try without it
        if (error.message?.includes('mapping_type') || error.code === '42703') {
          console.log('🔄 [MAPPING] mapping_type field not found, retrying without it');
          const { data: retryResult, error: retryError } = await supabase
            .from('transaction_mappings')
            .insert({
              standardized_identifier: data.standardizedIdentifier,
              user_id: data.userId,
              category_id: data.categoryId,
              subcategory_id: data.subcategoryId,
              confidence_score: data.confidenceScore,
              source: data.source,
              original_description: data.standardizedIdentifier || ''
            })
            .select()
            .single();

          if (retryError) {
            // Check if the error is due to duplicate key (23505)
            if (retryError.code === '23505') {
              console.log('🔄 [MAPPING] Duplicate key detected, finding existing mapping to update');
              
              // Find the existing mapping and update it instead
              const existingMappingResponse = await this.findMapping(data.standardizedIdentifier, data.userId);
              if (existingMappingResponse.found) {
                console.log('🔄 [MAPPING] Found existing mapping, updating instead');
                return this.updateMapping(existingMappingResponse.mapping!.id, {
                  categoryId: data.categoryId,
                  subcategoryId: data.subcategoryId,
                  confidenceScore: data.confidenceScore,
                  source: data.source,
                  mappingType: data.mappingType || 'bank'
                });
              }
            }
            
            console.error('❌ [MAPPING] Error creating transaction mapping (retry):', retryError);
            return null;
          }

          return {
            id: retryResult.id,
            standardizedIdentifier: retryResult.standardized_identifier,
            userId: retryResult.user_id,
            categoryId: retryResult.category_id,
            subcategoryId: retryResult.subcategory_id,
            confidenceScore: retryResult.confidence_score,
            source: retryResult.source,
            createdAt: retryResult.created_at,
            updatedAt: retryResult.updated_at
          };
        }
        
        console.error('❌ [MAPPING] Error creating transaction mapping:', error);
        return null;
      }

      return {
        id: result.id,
        standardizedIdentifier: result.standardized_identifier,
        userId: result.user_id,
        categoryId: result.category_id,
        subcategoryId: result.subcategory_id,
        confidenceScore: result.confidence_score,
        source: result.source,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      };
    } catch (error) {
      console.error('Exception in createMapping:', error);
      return null;
    }
  }

  /**
   * Updates an existing transaction mapping
   */
  async updateMapping(id: string, data: UpdateMappingData): Promise<TransactionMapping | null> {
    try {
      const { data: result, error } = await supabase
        .from('transaction_mappings')
        .update({
          category_id: data.categoryId,
          subcategory_id: data.subcategoryId,
          confidence_score: data.confidenceScore,
          source: data.source,
          mapping_type: data.mappingType || 'bank',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        // console.error('Error updating transaction mapping:', error);
        return null;
      }

      return {
        id: result.id,
        standardizedIdentifier: result.standardized_identifier,
        userId: result.user_id,
        categoryId: result.category_id,
        subcategoryId: result.subcategory_id,
        confidenceScore: result.confidence_score,
        source: result.source,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      };
    } catch (error) {
      // console.error('Exception in updateMapping:', error);
      return null;
    }
  }

  /**
   * Gets all mappings for a user, optionally filtered by category
   */
  async getUserMappings(userId: string, categoryId?: string): Promise<TransactionMapping[]> {
    try {
      let query = supabase
        .from('transaction_mappings')
        .select('*')
        .eq('user_id', userId);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) {
        // // console.error('Error getting user mappings:', error);
        return [];
      }

      return (data || []).map(item => ({
        id: item.id,
        standardizedIdentifier: item.standardized_identifier,
        userId: item.user_id,
        categoryId: item.category_id,
        subcategoryId: item.subcategory_id,
        confidenceScore: item.confidence_score,
        source: item.source,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      // console.error('Exception in getUserMappings:', error);
      return [];
    }
  }

  /**
   * Deletes a transaction mapping
   */
  async deleteMapping(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('transaction_mappings')
        .delete()
        .eq('id', id);

      if (error) {
        // // console.error('Error deleting transaction mapping:', error);
        return false;
      }

      return true;
    } catch (error) {
      // console.error('Exception in deleteMapping:', error);
      return false;
    }
  }

  /**
   * Applies existing mappings to transactions before sending to AI
   * This function checks if transactions already have mappings in the database
   * and applies them automatically, only sending unmapped transactions to AI
   * Now optimized with mapping_type to search only relevant mappings
   */
  async applyMappingsToTransactions(
    transactions: any[],
    userId: string,
    mappingType: 'bank' | 'credit_card' = 'bank'
  ): Promise<{
    mappedTransactions: any[];
    unmappedTransactions: any[];
  }> {
    // // console.log('🔍 [MAPPING] Applying mappings to', transactions.length, 'transactions with type:', mappingType);
    
    const mappedTransactions: any[] = [];
    const unmappedTransactions: any[] = [];
    
    // Process each transaction
    for (const transaction of transactions) {
      // Skip refunded transactions as they don't need categorization
      if (transaction.status === 'refunded') {
        mappedTransactions.push({
          ...transaction,
          categoryId: undefined,
          subcategoryId: undefined,
          aiSuggestion: undefined
        });
        continue;
      }
      
      // Generate standardized identifier for this transaction
      const standardizedIdentifier = this.standardizeIdentifier(transaction.description);
      // // console.log('🔍 [MAPPING] Checking mapping for:', {
      // //   id: transaction.id,
      //   description: transaction.description,
      //   standardizedIdentifier,
      //   mappingType
      // });
      
      // Check if we already have a mapping for this transaction with the specific mapping type
      const existingMapping = await this.findMapping(standardizedIdentifier, userId, mappingType);
      
      if (existingMapping.found && existingMapping.mapping) {
        // // console.log('✅ [MAPPING] Found existing mapping for transaction:', transaction.id, 'with type:', mappingType);
        // Apply existing mapping automatically
        mappedTransactions.push({
          ...transaction,
          categoryId: existingMapping.mapping.categoryId,
          subcategoryId: existingMapping.mapping.subcategoryId,
          aiSuggestion: {
            categoryId: existingMapping.mapping.categoryId,
            confidence: existingMapping.mapping.confidenceScore,
            reasoning: `Mapeamento automático baseado em transações ${mappingType === 'credit_card' ? 'de crédito' : 'bancárias'} anteriores`,
            isAISuggested: false
          }
        });
      } else {
        // // console.log('⚠️ [MAPPING] No existing mapping found for transaction:', transaction.id, 'with type:', mappingType);
        // No mapping found, send to AI for categorization
        unmappedTransactions.push(transaction);
      }
    }
    
    // // console.log('📊 [MAPPING] Mapping results for type', mappingType, ':', {
    // //   mapped: mappedTransactions.length,
    //   unmapped: unmappedTransactions.length
    // });
    
    return {
      mappedTransactions,
      unmappedTransactions
    };
  }
}

// Export a singleton instance
const transactionMappingService = new TransactionMappingService();
export default transactionMappingService;

// Test function for the new standardizeIdentifier implementation
// This can be removed after verification
export function testStandardizeIdentifier() {
  const service = new TransactionMappingService();
  
  // Test case from user example
  const testDescription = "TransferÃªncia enviada pelo Pix - Lucas Anderson Silva - â€¢â€¢â€¢.060.689-â€¢â€¢ - ITAÃš UNIBANCO S.A. (0341) AgÃªncia: 6305 Conta: 41155-2";
  
  // console.log('=== Testing standardizeIdentifier ===');
  // console.log('Input:', testDescription);
  
  const result = service.standardizeIdentifier(testDescription);
  // console.log('Output:', result);
  
  return result;
}

