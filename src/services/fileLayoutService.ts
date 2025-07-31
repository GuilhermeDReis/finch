import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export interface FileLayout extends Tables<'file_layouts'> {
  // Add a property to identify the type of layout
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

export class FileLayoutService {
  /**
   * Fetch active file layouts for a specific bank
   */
  static async getFileLayoutsByBank(bankId: string): Promise<FileLayout[]> {
    try {
      const { data, error } = await supabase
        .from('file_layouts')
        .select('*')
        .eq('bank_id', bankId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        // // console.error('Error fetching file layouts:', error);
        throw new Error('Failed to fetch file layouts');
      }

      // Add layout_type based on layout name for now
      const layouts = (data || []).map(layout => ({
        ...layout,
        layout_type: layout.name.includes('Cartão') || layout.name.includes('cartão') || layout.name.includes('Credit') ? 'credit_card' as const : 'bank' as const
      }));

      return layouts;
    } catch (error) {
      // // console.error('Error in getFileLayoutsByBank:', error);
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
      // // console.error('Error finding matching layout:', error);
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
