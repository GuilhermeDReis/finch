import { supabase } from '@/integrations/supabase/client';
import { getLogger } from '@/utils/logger';

const logger = getLogger('fileLayoutService');

export interface FileLayout {
  id: string;
  bank_id: string;
  name: string;
  description: string | null;
  date_column: string;
  amount_column: string;
  identifier_column: string;
  description_column: string;
  date_format: string;
  decimal_separator: string;
  thousands_separator: string | null;
  encoding: string;
  delimiter: string;
  has_header: boolean;
  sample_file: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  layout_type?: 'bank' | 'credit_card';
  file_type?: 'bank' | 'credit_card';
  header_pattern?: string[];
}

export interface CSVHeaderMapping {
  dateColumn: string;
  amountColumn: string;
  identifierColumn: string;
  descriptionColumn: string;
}

export interface LayoutMatchResult {
  layout: FileLayout;
  layoutType: 'bank' | 'credit_card';
  bankId: string;
  bankName?: string;
  confidence: number;
}

// Bank code to UUID mapping based on the migration data
const BANK_CODE_TO_UUID: Record<string, string> = {
  'nubank': '00000000-0000-0000-0000-000000000001',
  'itau': '00000000-0000-0000-0000-000000000002',
  'bradesco': '00000000-0000-0000-0000-000000000003'
};

export class FileLayoutService {
  /**
   * Calculate similarity between two header arrays using Jaccard similarity
   */
  static calculateHeaderSimilarity(headers1: string[], headers2: string[]): number {
    const set1 = new Set(headers1.map(h => h.toLowerCase().trim()));
    const set2 = new Set(headers2.map(h => h.toLowerCase().trim()));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * Check for exact header match
   */
  static isExactHeaderMatch(csvHeaders: string[], patternHeaders: string[]): boolean {
    if (csvHeaders.length !== patternHeaders.length) {
      return false;
    }
    
    const normalizedCsv = csvHeaders.map(h => h.toLowerCase().trim()).sort();
    const normalizedPattern = patternHeaders.map(h => h.toLowerCase().trim()).sort();
    
    return normalizedCsv.every((header, index) => header === normalizedPattern[index]);
  }

  /**
   * Resolve bank code to bank UUID
   */
  static async resolveBankId(bankIdOrCode: string): Promise<string> {
    try {
      // Check if it's already a UUID (contains hyphens)
      if (bankIdOrCode.includes('-')) {
        return bankIdOrCode;
      }

      // Use the static mapping for known bank codes
      const bankUuid = BANK_CODE_TO_UUID[bankIdOrCode.toLowerCase()];
      if (bankUuid) {
        return bankUuid;
      }

      // If not found in mapping, throw error
      throw new Error(`Bank not found for code: ${bankIdOrCode}`);
    } catch (error) {
      logger.error('Error resolving bank ID', { bankIdOrCode, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Fetch active file layouts for a specific bank
   */
  static async getFileLayoutsByBank(bankIdOrCode: string): Promise<FileLayout[]> {
    try {
      // Resolve bank code to UUID if needed
      const bankId = await this.resolveBankId(bankIdOrCode);

      const { data, error } = await supabase
        .from('file_layouts')
        .select('*')
        .eq('bank_id', bankId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching file layouts', { bankId, error });
        throw new Error(`Failed to fetch file layouts: ${error.message}`);
      }

      // Add layout_type based on layout name
      const layouts: FileLayout[] = [];
      
      if (data) {
        for (const layout of data) {
          const isCredit = layout.name.includes('Cartão') || 
                          layout.name.includes('cartão') || 
                          layout.name.includes('Credit');
          
          layouts.push({
            ...layout,
            layout_type: isCredit ? 'credit_card' : 'bank'
          });
        }
      }

      return layouts;
    } catch (error) {
      logger.error('Error in getFileLayoutsByBank', { bankIdOrCode, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Validate if CSV headers match a specific layout
   */
  static validateLayout(headers: string[], layout: FileLayout): boolean {
    const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
    
    // Check if all required columns exist in the CSV
    const requiredColumns = [
      layout.date_column,
      layout.amount_column,
      layout.identifier_column,
      layout.description_column
    ];

    return requiredColumns.every(column => {
      const normalizedColumn = column.trim().toLowerCase();
      return normalizedHeaders.includes(normalizedColumn);
    });
  }

  /**
   * Find matching layout for CSV headers
   */
  static async findMatchingLayout(bankId: string, headers: string[]): Promise<LayoutMatchResult | null> {
    try {
      const layouts = await this.getFileLayoutsByBank(bankId);
      
      // Try to find a layout that matches the headers
      for (const layout of layouts) {
        if (this.validateLayout(headers, layout)) {
          return {
            layout,
            layoutType: layout.layout_type || 'bank'
          };
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error finding matching layout', { bankId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Automatically detect bank and layout type from CSV headers
   */
  static async detectLayoutFromHeaders(csvHeaders: string[]): Promise<LayoutMatchResult | null> {
    try {
      logger.info('Starting automatic layout detection', { headerCount: csvHeaders.length });
      
      // Fetch all active file layouts from all banks
      const { data: layouts, error } = await supabase
        .from('file_layouts')
        .select(`
          *,
          banks!file_layouts_bank_id_fkey(
            id,
            name,
            code
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching layouts for detection', { error });
        throw new Error(`Failed to fetch layouts: ${error.message}`);
      }

      if (!layouts || layouts.length === 0) {
        logger.warn('No active layouts found for detection');
        return null;
      }

      let bestMatch: LayoutMatchResult | null = null;
      let bestScore = 0;

      // Check each layout for matches
      for (const layout of layouts) {
        const bank = Array.isArray(layout.banks) ? layout.banks[0] : layout.banks;
        
        if (!layout.header_pattern || !Array.isArray(layout.header_pattern)) {
          logger.warn('Layout has no header pattern', { layoutName: layout.name });
          
          // Try to create a fallback header pattern based on layout columns
          const fallbackPattern = [
            layout.date_column,
            layout.amount_column,
            layout.identifier_column,
            layout.description_column
          ].filter(Boolean); // Remove any undefined/null values
          
          if (fallbackPattern.length > 0) {
            logger.debug('Using fallback pattern', { layoutName: layout.name, fallbackPattern });
            layout.header_pattern = fallbackPattern;
          } else {
            continue;
          }
        }

        // Check for exact match first (highest priority)
        if (this.isExactHeaderMatch(csvHeaders, layout.header_pattern)) {
          logger.info('Exact layout match found', {
            layoutName: layout.name,
            bankName: bank?.name,
            confidence: 1.0
          });
          
          return {
            layout: {
              ...layout,
              layout_type: layout.file_type as 'bank' | 'credit_card' || 'bank'
            },
            layoutType: layout.file_type as 'bank' | 'credit_card' || 'bank',
            bankId: layout.bank_id,
            bankName: bank?.name,
            confidence: 1.0
          };
        }

        // Calculate similarity score for partial matches
        const similarity = this.calculateHeaderSimilarity(csvHeaders, layout.header_pattern);
        
        logger.debug('Layout similarity check', {
          layoutName: layout.name,
          bankName: bank?.name,
          similarity: parseFloat(similarity.toFixed(3))
        });

        // Consider layouts with similarity >= 0.7 as potential matches
        if (similarity >= 0.7 && similarity > bestScore) {
          bestScore = similarity;
          bestMatch = {
            layout: {
              ...layout,
              layout_type: layout.file_type as 'bank' | 'credit_card' || 'bank'
            },
            layoutType: layout.file_type as 'bank' | 'credit_card' || 'bank',
            bankId: layout.bank_id,
            bankName: bank?.name,
            confidence: similarity
          };
        }
      }

      if (bestMatch) {
        logger.info('Best layout match found', {
          layoutName: bestMatch.layout.name,
          bankName: bestMatch.bankName,
          confidence: parseFloat(bestMatch.confidence.toFixed(3))
        });
      } else {
        logger.warn('No suitable layout found', { headerCount: csvHeaders.length });
      }

      return bestMatch;
    } catch (error) {
      logger.error('Exception in layout detection', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Map CSV headers to layout columns
   */
  static mapHeadersToLayout(headers: string[], layout: FileLayout): CSVHeaderMapping {
    const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
    const normalizedDateColumn = layout.date_column.trim().toLowerCase();
    const normalizedAmountColumn = layout.amount_column.trim().toLowerCase();
    const normalizedIdentifierColumn = layout.identifier_column.trim().toLowerCase();
    const normalizedDescriptionColumn = layout.description_column.trim().toLowerCase();

    const dateColumn = headers.find(h => h.trim().toLowerCase() === normalizedDateColumn) || '';
    const amountColumn = headers.find(h => h.trim().toLowerCase() === normalizedAmountColumn) || '';
    const identifierColumn = headers.find(h => h.trim().toLowerCase() === normalizedIdentifierColumn) || '';
    const descriptionColumn = headers.find(h => h.trim().toLowerCase() === normalizedDescriptionColumn) || '';

    return {
      dateColumn,
      amountColumn,
      identifierColumn,
      descriptionColumn
    };
  }
}
