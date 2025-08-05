import { supabase } from '@/integrations/supabase/client';

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
}

// Bank code to UUID mapping based on the migration data
const BANK_CODE_TO_UUID: Record<string, string> = {
  'nubank': '00000000-0000-0000-0000-000000000001',
  'itau': '00000000-0000-0000-0000-000000000002',
  'bradesco': '00000000-0000-0000-0000-000000000003'
};

export class FileLayoutService {
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
      console.error('Error resolving bank ID:', error);
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
        console.error('Error fetching file layouts:', error);
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
      console.error('Error in getFileLayoutsByBank:', error);
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
      console.error('Error finding matching layout:', error);
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
