import { supabase } from '@/integrations/supabase/client';
import { getLogger } from '@/utils/logger';
import { 
  CreditCard, 
  CreditCardWithBank, 
  CreditCardFormData, 
  CreditCardInsert, 
  CreditCardUpdate 
} from '@/types/creditCard';

const logger = getLogger('creditCardService');

export class CreditCardService {
  /**
   * Fetch all credit cards for a user
   */
  static async fetchUserCreditCards(userId: string): Promise<CreditCardWithBank[]> {
    try {
      const { data, error } = await supabase
        .from('credit_cards')
        .select(`
          *,
          bank:banks(*)
        `)
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      logger.info('Fetched credit cards', { userId, count: data?.length || 0 });
      return data || [];
    } catch (error) {
      logger.error('Error fetching credit cards', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Fetch a single credit card by ID
   */
  static async fetchCreditCardById(cardId: string, userId: string): Promise<CreditCardWithBank | null> {
    try {
      const { data, error } = await supabase
        .from('credit_cards')
        .select(`
          *,
          banks(*)
        `)
        .eq('id', cardId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      logger.info('Fetched credit card', { cardId, userId });
      return data;
    } catch (error) {
      logger.error('Error fetching credit card', { cardId, userId, error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  }

  /**
   * Create a new credit card
   */
  static async createCreditCard(formData: CreditCardFormData, userId: string): Promise<CreditCard> {
    try {
      const insertData: CreditCardInsert = {
        ...formData,
        description: formData.description.trim(),
        user_id: userId,
      };

      const { data, error } = await supabase
        .from('credit_cards')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      logger.info('Created credit card', { cardId: data.id, userId });
      return data;
    } catch (error) {
      logger.error('Error creating credit card', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Update an existing credit card
   */
  static async updateCreditCard(cardId: string, formData: Partial<CreditCardFormData>, userId: string): Promise<CreditCard> {
    try {
      // Note: bank_id is intentionally omitted (business rule)
      const updateData: Partial<CreditCardUpdate> = {
        limit_amount: formData.limit_amount,
        description: formData.description?.trim(),
        brand: formData.brand,
        closing_day: formData.closing_day,
        due_day: formData.due_day,
        last_four_digits: formData.last_four_digits,
        background_image_url: formData.background_image_url,
      };

      const { data, error } = await supabase
        .from('credit_cards')
        .update(updateData)
        .eq('id', cardId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      logger.info('Updated credit card', { cardId, userId });
      return data;
    } catch (error) {
      logger.error('Error updating credit card', { cardId, userId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Archive a credit card (soft delete)
   */
  static async archiveCreditCard(cardId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('credit_cards')
        .update({ is_archived: true })
        .eq('id', cardId)
        .eq('user_id', userId);

      if (error) throw error;

      logger.info('Archived credit card', { cardId, userId });
    } catch (error) {
      logger.error('Error archiving credit card', { cardId, userId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Get credit card statistics for a user
   */
  static async getCreditCardStats(userId: string): Promise<{
    totalCards: number;
    activeCards: number;
    uniqueBanks: number;
  }> {
    try {
      const cards = await this.fetchUserCreditCards(userId);
      const uniqueBanks = new Set(cards.map(card => card.bank?.name)).size;

      return {
        totalCards: cards.length,
        activeCards: cards.length, // All fetched cards are active (not archived)
        uniqueBanks,
      };
    } catch (error) {
      logger.error('Error getting credit card stats', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        totalCards: 0,
        activeCards: 0,
        uniqueBanks: 0,
      };
    }
  }
}